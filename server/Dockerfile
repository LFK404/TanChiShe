# 1. 编译阶段
FROM golang:alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o snake-server .

# 2. 运行阶段
FROM alpine:latest
WORKDIR /app
RUN apk --no-cache add ca-certificates tzdata && \
    cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime && \
    echo "Asia/Shanghai" > /etc/timezone && \
    addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=builder --chown=appuser:appgroup /app/snake-server .

USER appuser
EXPOSE 8080
ENV PORT=8080 TZ=Asia/Shanghai
CMD ["./snake-server"]
