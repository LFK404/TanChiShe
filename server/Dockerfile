# 1. 编译阶段
FROM golang:1.24-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o snake-server .

# 2. 运行阶段 (仅 15MB 极简镜像)
FROM alpine:latest
WORKDIR /app
RUN apk --no-cache add ca-certificates tzdata
COPY --from=builder /app/snake-server .
EXPOSE 8080
ENV PORT=8080
CMD ["./snake-server"]
