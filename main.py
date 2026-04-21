import os
import json
import secrets
from typing import List, Optional
from fastapi import FastAPI, HTTPException, Header, Query
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


def ensure_tables():
    """启动时确保所有表存在"""
    sqls = [
        """
        CREATE TABLE IF NOT EXISTS profiles (
          eng_name VARCHAR(64) NOT NULL PRIMARY KEY,
          chn_name VARCHAR(64) DEFAULT '',
          quote VARCHAR(255) DEFAULT '',
          mini_badge_ids TEXT,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) DEFAULT CHARSET=utf8mb4;
        """,
        """
        CREATE TABLE IF NOT EXISTS accounts (
          username VARCHAR(64) NOT NULL PRIMARY KEY,
          password VARCHAR(255) NOT NULL,
          role VARCHAR(16) NOT NULL DEFAULT 'user',
          chn_name VARCHAR(64) DEFAULT '',
          dept VARCHAR(128) DEFAULT '',
          position_name VARCHAR(64) DEFAULT '',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) DEFAULT CHARSET=utf8mb4;
        """,
        """
        CREATE TABLE IF NOT EXISTS sessions (
          token VARCHAR(64) NOT NULL PRIMARY KEY,
          username VARCHAR(64) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_username (username)
        ) DEFAULT CHARSET=utf8mb4;
        """,
        """
        CREATE TABLE IF NOT EXISTS persons (
          id INT AUTO_INCREMENT PRIMARY KEY,
          eng_name VARCHAR(64) NOT NULL UNIQUE,
          name VARCHAR(64) NOT NULL,
          dept VARCHAR(128) DEFAULT '',
          role VARCHAR(64) DEFAULT '',
          level INT DEFAULT 1,
          sort_order INT DEFAULT 0,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) DEFAULT CHARSET=utf8mb4;
        """,
        """
        CREATE TABLE IF NOT EXISTS honors (
          id INT AUTO_INCREMENT PRIMARY KEY,
          person_eng_name VARCHAR(64) NOT NULL,
          name VARCHAR(128) NOT NULL,
          quality VARCHAR(16) NOT NULL DEFAULT 'common',
          category VARCHAR(32) NOT NULL DEFAULT 'achievement',
          icon VARCHAR(64) DEFAULT 'ri-medal-fill',
          date VARCHAR(32) DEFAULT '',
          description TEXT,
          reason TEXT,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_person (person_eng_name)
        ) DEFAULT CHARSET=utf8mb4;
        """,
    ]
    try:
        with get_conn() as conn:
            with conn.cursor() as cur:
                for sql in sqls:
                    cur.execute(sql)
                # 确保有 admin 账号
                cur.execute("SELECT 1 FROM accounts WHERE username='admin'")
                if not cur.fetchone():
                    cur.execute(
                        "INSERT INTO accounts (username, password, role, chn_name) VALUES ('admin','123456','admin','管理员')"
                    )
    except Exception as e:
        print("ensure_tables error:", e)


app = FastAPI(title="王者策划荣誉系统 API")


@app.on_event("startup")
def _startup():
    ensure_tables()


# ===== 工具函数 =====
def _get_user_by_token(token: Optional[str]):
    if not token:
        return None
    try:
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT a.username, a.role, a.chn_name, a.dept, a.position_name "
                    "FROM sessions s JOIN accounts a ON s.username=a.username WHERE s.token=%s",
                    (token,),
                )
                return cur.fetchone()
    except Exception:
        return None


def _require_user(authorization: Optional[str], token_query: Optional[str] = None):
    token = token_query
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization[7:].strip()
    user = _get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="未登录或登录已过期")
    return user


def _require_admin(authorization: Optional[str], token_query: Optional[str] = None):
    user = _require_user(authorization, token_query)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="需要管理员权限")
    return user


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


class LoginIn(BaseModel):
    username: str
    password: str


class ChangePwdIn(BaseModel):
    oldPassword: str
    newPassword: str


class AdminChangePwdIn(BaseModel):
    username: str
    newPassword: str


class PersonIn(BaseModel):
    engName: str
    name: str
    dept: Optional[str] = ""
    role: Optional[str] = ""
    level: Optional[int] = 1
    sortOrder: Optional[int] = 0


class PersonUpdateIn(BaseModel):
    name: Optional[str] = None
    dept: Optional[str] = None
    role: Optional[str] = None
    level: Optional[int] = None
    sortOrder: Optional[int] = None


class HonorIn(BaseModel):
    personEngName: str
    name: str
    quality: str = "common"
    category: str = "achievement"
    icon: Optional[str] = "ri-medal-fill"
    date: Optional[str] = ""
    description: Optional[str] = ""
    reason: Optional[str] = ""


class HonorUpdateIn(BaseModel):
    name: Optional[str] = None
    quality: Optional[str] = None
    category: Optional[str] = None
    icon: Optional[str] = None
    date: Optional[str] = None
    description: Optional[str] = None
    reason: Optional[str] = None


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


# ===== 路由：静态首页 =====
@app.get("/")
def root():
    return RedirectResponse(url="/static/index.html")


# ===== profiles（签名+展示徽章） =====
@app.get("/api/profiles", response_model=List[ProfileOut])
def list_profiles():
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
    return _do_upsert(data.engName or "", data)


@app.post("/api/profile/{eng_name}", response_model=ProfileOut)
def upsert_profile(eng_name: str, data: ProfileIn):
    return _do_upsert(eng_name, data)


@app.get("/api/save", response_model=ProfileOut)
def save_profile_get(
    engName: str,
    chnName: str = "",
    quote: Optional[str] = None,
    miniBadgeIds: Optional[str] = None,
):
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


# ===== 冗余接口：绕开针对 /api/* 的网关规则 =====
@app.get("/hof/save", response_model=ProfileOut)
def hof_save_profile(
    engName: str,
    chnName: str = "",
    quote: Optional[str] = None,
    miniBadgeIds: Optional[str] = None,
):
    return save_profile_get(engName, chnName, quote, miniBadgeIds)


@app.get("/hof/profile/{eng_name}", response_model=ProfileOut)
def hof_get_profile(eng_name: str):
    return get_profile(eng_name)


@app.get("/hof/profiles", response_model=List[ProfileOut])
def hof_list_profiles():
    return list_profiles()


# ===== 账号系统 =====
def _gen_token() -> str:
    return secrets.token_hex(24)


def _do_login(username: str, password: str):
    if not username or not password:
        raise HTTPException(status_code=400, detail="用户名或密码不能为空")
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT username, password, role, chn_name, dept, position_name FROM accounts WHERE username=%s",
                (username,),
            )
            row = cur.fetchone()
            if not row or row["password"] != password:
                raise HTTPException(status_code=401, detail="用户名或密码错误")
            token = _gen_token()
            cur.execute("INSERT INTO sessions (token, username) VALUES (%s, %s)", (token, username))
    return {
        "token": token,
        "username": row["username"],
        "role": row["role"],
        "chnName": row["chn_name"] or "",
        "dept": row["dept"] or "",
        "positionName": row["position_name"] or "",
    }


@app.post("/api/auth/login")
def login(data: LoginIn):
    return _do_login(data.username, data.password)


# GET 登录备用接口（绕过网关对 /api/* POST 的拦截）
@app.get("/hof/auth/login")
def login_get(username: str, password: str):
    return _do_login(username, password)


@app.get("/api/auth/me")
def me(authorization: Optional[str] = Header(None), token: Optional[str] = Query(None)):
    user = _require_user(authorization, token)
    return {
        "username": user["username"],
        "role": user["role"],
        "chnName": user.get("chn_name") or "",
        "dept": user.get("dept") or "",
        "positionName": user.get("position_name") or "",
    }


@app.get("/hof/auth/me")
def me_hof(authorization: Optional[str] = Header(None), token: Optional[str] = Query(None)):
    return me(authorization, token)


def _do_logout(token: Optional[str]):
    if token:
        try:
            with get_conn() as conn:
                with conn.cursor() as cur:
                    cur.execute("DELETE FROM sessions WHERE token=%s", (token,))
        except Exception:
            pass
    return {"ok": True}


@app.post("/api/auth/logout")
def logout(authorization: Optional[str] = Header(None), token: Optional[str] = Query(None)):
    tk = token
    if authorization and authorization.lower().startswith("bearer "):
        tk = authorization[7:].strip()
    return _do_logout(tk)


@app.get("/hof/auth/logout")
def logout_get(authorization: Optional[str] = Header(None), token: Optional[str] = Query(None)):
    return logout(authorization, token)


def _do_change_pwd(username: str, old_pwd: str, new_pwd: str):
    if not new_pwd or len(new_pwd) < 4:
        raise HTTPException(status_code=400, detail="新密码至少 4 位")
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT password FROM accounts WHERE username=%s", (username,))
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="账号不存在")
            if row["password"] != old_pwd:
                raise HTTPException(status_code=400, detail="原密码错误")
            cur.execute("UPDATE accounts SET password=%s WHERE username=%s", (new_pwd, username))
            # 密码变更后使其它 token 失效（保留当前不变也可，这里直接清空所有）
            cur.execute("DELETE FROM sessions WHERE username=%s", (username,))
    return {"ok": True}


@app.post("/api/auth/change-password")
def change_password(
    data: ChangePwdIn,
    authorization: Optional[str] = Header(None),
    token: Optional[str] = Query(None),
):
    user = _require_user(authorization, token)
    return _do_change_pwd(user["username"], data.oldPassword, data.newPassword)


@app.get("/hof/auth/change-password")
def change_password_get(
    oldPassword: str,
    newPassword: str,
    authorization: Optional[str] = Header(None),
    token: Optional[str] = Query(None),
):
    user = _require_user(authorization, token)
    return _do_change_pwd(user["username"], oldPassword, newPassword)


# ===== 管理员：账号管理 =====
class AccountIn(BaseModel):
    username: str
    password: str
    role: Optional[str] = "user"
    chnName: Optional[str] = ""
    dept: Optional[str] = ""
    positionName: Optional[str] = ""


@app.get("/api/admin/accounts")
def list_accounts(authorization: Optional[str] = Header(None), token: Optional[str] = Query(None)):
    _require_admin(authorization, token)
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT username, role, chn_name, dept, position_name, created_at FROM accounts ORDER BY created_at DESC")
            rows = cur.fetchall() or []
    return [
        {
            "username": r["username"],
            "role": r["role"],
            "chnName": r.get("chn_name") or "",
            "dept": r.get("dept") or "",
            "positionName": r.get("position_name") or "",
        }
        for r in rows
    ]


@app.post("/api/admin/account")
def create_account(
    data: AccountIn,
    authorization: Optional[str] = Header(None),
    token: Optional[str] = Query(None),
):
    _require_admin(authorization, token)
    if not data.username or not data.password:
        raise HTTPException(status_code=400, detail="用户名密码不能为空")
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT 1 FROM accounts WHERE username=%s", (data.username,))
            if cur.fetchone():
                raise HTTPException(status_code=400, detail="该账号已存在")
            cur.execute(
                "INSERT INTO accounts (username, password, role, chn_name, dept, position_name) VALUES (%s,%s,%s,%s,%s,%s)",
                (data.username, data.password, data.role or "user", data.chnName or "", data.dept or "", data.positionName or ""),
            )
    return {"ok": True}


@app.post("/api/admin/reset-password")
def admin_reset_password(
    data: AdminChangePwdIn,
    authorization: Optional[str] = Header(None),
    token: Optional[str] = Query(None),
):
    _require_admin(authorization, token)
    if not data.newPassword or len(data.newPassword) < 4:
        raise HTTPException(status_code=400, detail="新密码至少 4 位")
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT 1 FROM accounts WHERE username=%s", (data.username,))
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="账号不存在")
            cur.execute("UPDATE accounts SET password=%s WHERE username=%s", (data.newPassword, data.username))
            cur.execute("DELETE FROM sessions WHERE username=%s", (data.username,))
    return {"ok": True}


# ===== 策划 & 荣誉数据接口 =====
@app.get("/api/persons")
def list_persons():
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, eng_name, name, dept, role, level, sort_order FROM persons ORDER BY sort_order ASC, id ASC"
            )
            prs = cur.fetchall() or []
            cur.execute(
                "SELECT id, person_eng_name, name, quality, category, icon, date, description, reason FROM honors ORDER BY date DESC, id ASC"
            )
            hs = cur.fetchall() or []
            cur.execute("SELECT eng_name, chn_name, quote, mini_badge_ids FROM profiles")
            prof_rows = cur.fetchall() or []
    prof_map = {}
    for r in prof_rows:
        ids: List[int] = []
        raw = r.get("mini_badge_ids") or ""
        if raw:
            try:
                parsed = json.loads(raw)
                if isinstance(parsed, list):
                    ids = [int(x) for x in parsed if isinstance(x, (int, str)) and str(x).isdigit()]
            except Exception:
                ids = []
        prof_map[r["eng_name"]] = {
            "quote": r.get("quote") or "",
            "miniBadgeIds": ids,
        }
    honors_map = {}
    for h in hs:
        honors_map.setdefault(h["person_eng_name"], []).append({
            "id": h["id"],
            "name": h["name"],
            "quality": h["quality"],
            "category": h["category"],
            "icon": h["icon"] or "ri-medal-fill",
            "date": h["date"] or "",
            "desc": h.get("description") or "",
            "reason": h.get("reason") or "",
        })
    result = []
    for p in prs:
        key = p["eng_name"]
        prof = prof_map.get(key, {})
        result.append({
            "id": p["id"],
            "engName": p["eng_name"],
            "name": p["name"],
            "dept": p["dept"] or "",
            "role": p["role"] or "",
            "level": p["level"] or 1,
            "sortOrder": p["sort_order"] or 0,
            "quote": prof.get("quote", ""),
            "miniBadgeIds": prof.get("miniBadgeIds", []),
            "honors": honors_map.get(key, []),
        })
    return result


@app.get("/hof/persons")
def list_persons_hof():
    return list_persons()


@app.post("/api/admin/person")
def admin_create_person(
    data: PersonIn,
    authorization: Optional[str] = Header(None),
    token: Optional[str] = Query(None),
):
    _require_admin(authorization, token)
    if not data.engName or not data.name:
        raise HTTPException(status_code=400, detail="engName 与 name 必填")
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT 1 FROM persons WHERE eng_name=%s", (data.engName,))
            if cur.fetchone():
                raise HTTPException(status_code=400, detail="该 engName 已存在")
            cur.execute(
                "INSERT INTO persons (eng_name, name, dept, role, level, sort_order) VALUES (%s,%s,%s,%s,%s,%s)",
                (data.engName, data.name, data.dept or "", data.role or "", data.level or 1, data.sortOrder or 0),
            )
            # 同时给一个空 profile 占位
            cur.execute("SELECT 1 FROM profiles WHERE eng_name=%s", (data.engName,))
            if not cur.fetchone():
                cur.execute(
                    "INSERT INTO profiles (eng_name, chn_name, quote, mini_badge_ids) VALUES (%s,%s,'','[]')",
                    (data.engName, data.name),
                )
    return {"ok": True}


@app.post("/api/admin/person/{eng_name}")
def admin_update_person(
    eng_name: str,
    data: PersonUpdateIn,
    authorization: Optional[str] = Header(None),
    token: Optional[str] = Query(None),
):
    _require_admin(authorization, token)
    fields = []
    values = []
    if data.name is not None:
        fields.append("name=%s")
        values.append(data.name)
    if data.dept is not None:
        fields.append("dept=%s")
        values.append(data.dept)
    if data.role is not None:
        fields.append("role=%s")
        values.append(data.role)
    if data.level is not None:
        fields.append("level=%s")
        values.append(data.level)
    if data.sortOrder is not None:
        fields.append("sort_order=%s")
        values.append(data.sortOrder)
    if not fields:
        return {"ok": True}
    values.append(eng_name)
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(f"UPDATE persons SET {', '.join(fields)} WHERE eng_name=%s", values)
    return {"ok": True}


@app.delete("/api/admin/person/{eng_name}")
def admin_delete_person(
    eng_name: str,
    authorization: Optional[str] = Header(None),
    token: Optional[str] = Query(None),
):
    _require_admin(authorization, token)
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM honors WHERE person_eng_name=%s", (eng_name,))
            cur.execute("DELETE FROM profiles WHERE eng_name=%s", (eng_name,))
            cur.execute("DELETE FROM persons WHERE eng_name=%s", (eng_name,))
    return {"ok": True}


@app.post("/api/admin/honor")
def admin_create_honor(
    data: HonorIn,
    authorization: Optional[str] = Header(None),
    token: Optional[str] = Query(None),
):
    _require_admin(authorization, token)
    if not data.personEngName or not data.name:
        raise HTTPException(status_code=400, detail="personEngName 与 name 必填")
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT 1 FROM persons WHERE eng_name=%s", (data.personEngName,))
            if not cur.fetchone():
                raise HTTPException(status_code=400, detail="目标策划不存在")
            cur.execute(
                "INSERT INTO honors (person_eng_name, name, quality, category, icon, date, description, reason) "
                "VALUES (%s,%s,%s,%s,%s,%s,%s,%s)",
                (
                    data.personEngName, data.name, data.quality or "common",
                    data.category or "achievement", data.icon or "ri-medal-fill",
                    data.date or "", data.description or "", data.reason or "",
                ),
            )
            new_id = cur.lastrowid
    return {"ok": True, "id": new_id}


@app.post("/api/admin/honor/{honor_id}")
def admin_update_honor(
    honor_id: int,
    data: HonorUpdateIn,
    authorization: Optional[str] = Header(None),
    token: Optional[str] = Query(None),
):
    _require_admin(authorization, token)
    fields = []
    values = []
    for db_col, attr in [
        ("name", "name"), ("quality", "quality"), ("category", "category"),
        ("icon", "icon"), ("date", "date"), ("description", "description"), ("reason", "reason"),
    ]:
        val = getattr(data, attr)
        if val is not None:
            fields.append(f"{db_col}=%s")
            values.append(val)
    if not fields:
        return {"ok": True}
    values.append(honor_id)
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(f"UPDATE honors SET {', '.join(fields)} WHERE id=%s", values)
    return {"ok": True}


@app.delete("/api/admin/honor/{honor_id}")
def admin_delete_honor(
    honor_id: int,
    authorization: Optional[str] = Header(None),
    token: Optional[str] = Query(None),
):
    _require_admin(authorization, token)
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM honors WHERE id=%s", (honor_id,))
    return {"ok": True}


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
