FROM python:3.11-slim

ENV TZ=Asia/Shanghai
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# 把前端文件放到 static 目录以便 FastAPI 挂载
RUN mkdir -p static static/default_avatars static/avatars static/avatars_pending \
 && cp -f index.html style.css main.js data.js static/ || true

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]