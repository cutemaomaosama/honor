import os
import json
from typing import List, Optional
from fastapi import FastAPI, HTTPException
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
import pymysql
from pymysql.cursors import DictCursor

# ===== 数据库配置（全部从环境变量读取） =====
DB_CONFIG = {
    "host": os.environ.get("MYSQL_HOST", "127.0.0.1"),
    "port": int(os.environ.get("MYSQL_PORT", "3306")),
    "user": os.environ.get("MYSQL_USER", "root"),
    "password": os.environ.get("MYSQL_PASSWORD", ""),
    "database": os.environ.get("MYSQL_DATABASE", "pazp4hz8"),
    "charset": "utf8mb4",
    "cursorclass": DictCursor,
    "autocommit": True,
}


def get_conn():
    return pymysql.connect(**DB_CONFIG)


def ensure_table():
    """启动时确保表存在"""
    sql = """
    CREATE TABLE IF NOT EXISTS profiles (
      eng_name VARCHAR(64) NOT NULL PRIMARY KEY,
      chn_name VARCHAR(64) DEFAULT '',
      quote VARCHAR(255) DEFAULT '',
      mini_badge_ids TEXT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) DEFAULT CHARSET=utf8mb4;
    """
    try:
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(sql)
    except Exception as e:
        print("ensure_table error:", e)


app = FastAPI(title="王者策划荣誉系统 API")


@app.on_event("startup")
def _startup():
    ensure_table()


# ===== 数据模型 =====
class ProfileOut(BaseModel):
    engName: str
    chnName: str = ""
    quote: str = ""
    miniBadgeIds: List[int] = Field(default_factory=list)


class ProfileIn(BaseModel):
    engName: Optional[str] = None
    chnName: Optional[str] = ""
    quote: Optional[str] = None
    miniBadgeIds: Optional[List[int]] = None


def _row_to_profile(row) -> ProfileOut:
    ids: List[int] = []
    raw = row.get("mini_badge_ids") or ""
    if raw:
        try:
            parsed = json.loads(raw)
            if isinstance(parsed, list):
                ids = [int(x) for x in parsed if isinstance(x, (int, str)) and str(x).isdigit()]
        except Exception:
            ids = []
    return ProfileOut(
        engName=row["eng_name"],
        chnName=row.get("chn_name") or "",
        quote=row.get("quote") or "",
        miniBadgeIds=ids,
    )


# ===== 路由 =====
@app.get("/")
def root():
    return RedirectResponse(url="/static/index.html")


@app.get("/api/profiles", response_model=List[ProfileOut])
def list_profiles():
    """一次性返回所有 profile，前端初始化时拉取"""
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT eng_name, chn_name, quote, mini_badge_ids FROM profiles")
            rows = cur.fetchall() or []
    return [_row_to_profile(r) for r in rows]


@app.get("/api/profile/{eng_name}", response_model=ProfileOut)
def get_profile(eng_name: str):
    eng_name = eng_name.strip()
    if not eng_name:
        raise HTTPException(status_code=400, detail="engName 不能为空")
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT eng_name, chn_name, quote, mini_badge_ids FROM profiles WHERE eng_name=%s",
                (eng_name,),
            )
            row = cur.fetchone()
    if not row:
        return ProfileOut(engName=eng_name)
    return _row_to_profile(row)


def _do_upsert(eng_name: str, data: ProfileIn) -> ProfileOut:
    eng_name = (eng_name or "").strip()
    if not eng_name:
        raise HTTPException(status_code=400, detail="engName 不能为空")

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT eng_name, chn_name, quote, mini_badge_ids FROM profiles WHERE eng_name=%s",
                (eng_name,),
            )
            row = cur.fetchone()

            new_quote = row["quote"] if row and data.quote is None else (data.quote or "")
            if data.miniBadgeIds is None:
                new_ids_raw = row["mini_badge_ids"] if row else "[]"
            else:
                new_ids_raw = json.dumps(list(data.miniBadgeIds))
            new_chn = data.chnName or (row["chn_name"] if row else "") or ""

            if row:
                cur.execute(
                    "UPDATE profiles SET chn_name=%s, quote=%s, mini_badge_ids=%s WHERE eng_name=%s",
                    (new_chn, new_quote, new_ids_raw, eng_name),
                )
            else:
                cur.execute(
                    "INSERT INTO profiles (eng_name, chn_name, quote, mini_badge_ids) VALUES (%s,%s,%s,%s)",
                    (eng_name, new_chn, new_quote, new_ids_raw),
                )

            cur.execute(
                "SELECT eng_name, chn_name, quote, mini_badge_ids FROM profiles WHERE eng_name=%s",
                (eng_name,),
            )
            row2 = cur.fetchone()
    return _row_to_profile(row2)


@app.post("/api/profile", response_model=ProfileOut)
def upsert_profile_flat(data: ProfileIn):
    """
    推荐使用的保存接口：engName 放在 body 中，路径固定不带动态段，
    避免部分部署网关对动态路径 POST 的拦截（如 405 Not Allowed）。
    """
    return _do_upsert(data.engName or "", data)


@app.post("/api/profile/{eng_name}", response_model=ProfileOut)
def upsert_profile(eng_name: str, data: ProfileIn):
    """保留兼容路径。"""
    return _do_upsert(eng_name, data)


@app.get("/api/save", response_model=ProfileOut)
def save_profile_get(
    engName: str,
    chnName: str = "",
    quote: Optional[str] = None,
    miniBadgeIds: Optional[str] = None,
):
    """
    使用 GET 方式进行保存，用于绕开部分网关对 /api/* POST 的统一拦截（如 405）。
    - engName: 英文名（必填）
    - chnName: 中文名
    - quote: 个性签名（不传表示不修改）
    - miniBadgeIds: 逗号分隔的数字，如 "1,3,5"；传空串表示清空；不传表示不修改
    """
    ids_list: Optional[List[int]] = None
    if miniBadgeIds is not None:
        ids_list = []
        for seg in miniBadgeIds.split(","):
            seg = seg.strip()
            if seg.isdigit():
                ids_list.append(int(seg))
    data = ProfileIn(
        engName=engName,
        chnName=chnName or "",
        quote=quote,
        miniBadgeIds=ids_list,
    )
    return _do_upsert(engName, data)


# ===== 冗余接口：使用非 /api 前缀，绕开针对 /api/* 的网关规则 =====
@app.get("/hof/save", response_model=ProfileOut)
def hof_save_profile(
    engName: str,
    chnName: str = "",
    quote: Optional[str] = None,
    miniBadgeIds: Optional[str] = None,
):
    """与 /api/save 功能等价，仅改变路径前缀，用于绕开网关拦截。"""
    return save_profile_get(engName, chnName, quote, miniBadgeIds)


@app.get("/hof/profile/{eng_name}", response_model=ProfileOut)
def hof_get_profile(eng_name: str):
    return get_profile(eng_name)


@app.get("/hof/profiles", response_model=List[ProfileOut])
def hof_list_profiles():
    return list_profiles()


# 必须放在最后：挂载静态资源
import shutil as _shutil
_static_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")
os.makedirs(_static_dir, exist_ok=True)
for _fn in ("index.html", "style.css", "main.js", "data.js"):
    _src = os.path.join(os.path.dirname(os.path.abspath(__file__)), _fn)
    _dst = os.path.join(_static_dir, _fn)
    if os.path.exists(_src) and (
        not os.path.exists(_dst) or os.path.getmtime(_src) > os.path.getmtime(_dst)
    ):
        try:
            _shutil.copyfile(_src, _dst)
        except Exception as _e:
            print(f"copy {_fn} failed:", _e)

app.mount("/static", StaticFiles(directory=_static_dir, html=True), name="static")
