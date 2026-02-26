# SSH 密钥配置指南

> 🔑 为腾讯云服务器 43.167.164.233 配置 SSH 密钥

---

## 第一步：生成本地 SSH 密钥（本机）

### 1.1 创建 SSH 密钥对

在本地机器的终端执行：

```bash
# 生成 4096 位 RSA 密钥（推荐）
ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa -N ""

# 说明：
# -t rsa          : 加密类型为 RSA
# -b 4096         : 密钥长度 4096 位（更安全）
# -f ~/.ssh/id_rsa : 保存位置为 ~/.ssh/id_rsa
# -N ""           : 密钥口令为空（不设置密码，部署脚本可自动使用）
```

### 1.2 验证密钥生成成功

```bash
# 检查私钥文件
ls -la ~/.ssh/id_rsa
# 应该显示类似：-rw------- 1 admin staff 3434 Feb 26 12:34 /Users/admin/.ssh/id_rsa

# 检查公钥文件
ls -la ~/.ssh/id_rsa.pub
# 应该显示类似：-rw-r--r-- 1 admin staff 743 Feb 26 12:34 /Users/admin/.ssh/id_rsa.pub

# 查看公钥内容
cat ~/.ssh/id_rsa.pub
# 会看到类似：ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQDxxxxx...
```

### 1.3 正确的权限设置

```bash
# 设置权限（很重要，否则 SSH 会拒绝）
chmod 700 ~/.ssh
chmod 600 ~/.ssh/id_rsa
chmod 644 ~/.ssh/id_rsa.pub

# 验证权限
ls -la ~/.ssh/
# 应该看到：
# drwx------   .ssh
# -rw-------   id_rsa
# -rw-r--r--   id_rsa.pub
```

---

## 第二步：添加公钥到腾讯云服务器

### 方案 A：通过腾讯云控制台 VNC 连接（推荐）

#### A1. 使用 VNC 连接服务器

1. 打开腾讯云控制台
2. 进入 CVM 实例
3. 点击实例 ID（43.167.164.233）
4. 在右上角找到 "登录" 按钮
5. 选择 "标准登录" 或 "VNC 登录"
6. 如果提示密码，使用腾讯云中设置的密码登录

#### A2. 添加公钥到 `authorized_keys`

连接成功后，在服务器终端执行：

```bash
# 1. 进入 SSH 配置目录
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# 2. 创建 authorized_keys 文件
touch ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys

# 3. 编辑 authorized_keys
nano ~/.ssh/authorized_keys
# 或使用 vim
vim ~/.ssh/authorized_keys

# 4. 将你本地的公钥内容粘贴进去
# （从本地执行：cat ~/.ssh/id_rsa.pub，然后复制内容粘贴到这里）

# 5. 保存并退出
# 按 Ctrl+X (nano) 或 :wq (vim)
```

#### A3. 验证公钥已添加

```bash
# 检查 authorized_keys 内容
cat ~/.ssh/authorized_keys
# 应该看到你粘贴的 ssh-rsa AAAA...

# 检查权限
ls -la ~/.ssh/
# -rw------- authorized_keys  # 权限必须是这样

# 检查 SSH 服务状态
sudo systemctl status ssh
# 应该显示 active (running)
```

---

### 方案 B：一行命令添加公钥（如果已能密码连接）

如果你的服务器已经设置了密码，可以使用 `ssh-copy-id` 命令：

```bash
# 将本地公钥复制到服务器（会提示输入密码）
ssh-copy-id -i ~/.ssh/id_rsa.pub ubuntu@43.167.164.233

# 验证成功
ssh -i ~/.ssh/id_rsa ubuntu@43.167.164.233
# 应该能无密码登录
```

---

## 第三步：测试 SSH 连接

### 3.1 本地测试连接

```bash
# 使用密钥连接到服务器
ssh -i ~/.ssh/id_rsa ubuntu@43.167.164.233

# 如果成功，你会看到：
# Welcome to Ubuntu 24.04 LTS (GNU/Linux 5.15.x aarch64)
# ...
# ubuntu@iZxxx:~$

# 退出连接
exit
```

### 3.2 设置 SSH 配置文件（可选但推荐）

创建 `~/.ssh/config` 文件，以后可以直接 `ssh tencent-server` 连接：

```bash
# 编辑 SSH 配置文件
nano ~/.ssh/config

# 添加以下内容：
```

```
Host tencent-server
    HostName 43.167.164.233
    User ubuntu
    IdentityFile ~/.ssh/id_rsa
    Port 22
    AddKeysToAgent yes
    IdentitiesOnly yes
```

```bash
# 保存后，就可以用简短命令连接：
ssh tencent-server

# 同样适用于其他 SSH 工具：
scp -r /local/path tencent-server:/remote/path
```

### 3.3 设置权限并测试

```bash
# 设置 config 文件权限
chmod 600 ~/.ssh/config

# 测试新配置
ssh tencent-server
# 应该无需输入密码即可连接
```

---

## 第四步：验证部署脚本能找到密钥

```bash
# 返回项目目录
cd /Users/admin/VScode/wechat-rss-aggregator

# 运行部署脚本
chmod +x deploy-to-tencent.sh
./deploy-to-tencent.sh

# 脚本应该输出：
# [INFO] 找到 SSH 密钥: ~/.ssh/id_rsa
# [INFO] 开始 SSH 连接测试...
# [SUCCESS] SSH 连接正常
# ...（继续部署）
```

---

## 🔧 常见 SSH 问题解决

### 问题 1：Permission denied (publickey)

**原因：**
- authorized_keys 文件权限不对
- 公钥格式错误
- 服务器 SSH 配置问题

**解决：**

```bash
# 在服务器上检查和修复权限
ssh ubuntu@43.167.164.233  # 用密码登录

# 检查权限
ls -la ~/.ssh/
# 应该是：
# drwx------  .ssh
# -rw-------  authorized_keys

# 修复权限
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys

# 检查 authorized_keys 内容
cat ~/.ssh/authorized_keys
# 应该看到 ssh-rsa 开头的完整公钥

# 检查 SSH 服务
sudo systemctl restart ssh
sudo systemctl status ssh
```

### 问题 2：ssh: connect to host failed

**原因：**
- 服务器不在线
- 防火墙阻止
- 网络连接问题

**解决：**

```bash
# 检查网络连接
ping 43.167.164.233
# 应该能 ping 通

# 检查 SSH 端口
nmap -p 22 43.167.164.233
# 应该显示 22/tcp open ssh

# 检查本地 SSH 配置
ssh -v ubuntu@43.167.164.233
# -v 显示详细信息，帮助诊断问题
```

### 问题 3：密钥权限不对

**症状：** Permissions 0644 for 'id_rsa' are too open

**解决：**

```bash
# 修复权限
chmod 600 ~/.ssh/id_rsa
chmod 644 ~/.ssh/id_rsa.pub
chmod 700 ~/.ssh

# 重新尝试连接
ssh -i ~/.ssh/id_rsa ubuntu@43.167.164.233
```

### 问题 4：公钥格式错误

**症状：** 添加公钥后还是需要密码

**解决：**

```bash
# 检查公钥内容（应该是一行，以 ssh-rsa 开头）
cat ~/.ssh/id_rsa.pub
# 输出应该类似：
# ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQDxxxxx... user@hostname

# 如果是多行或格式错误，重新生成
ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa -N ""

# 重新添加到服务器
cat ~/.ssh/id_rsa.pub | ssh ubuntu@43.167.164.233 'cat >> ~/.ssh/authorized_keys'
```

---

## 📋 SSH 密钥配置检查清单

### 本地机器

- [ ] SSH 密钥已生成：`~/.ssh/id_rsa` 存在
- [ ] 公钥已生成：`~/.ssh/id_rsa.pub` 存在
- [ ] 私钥权限正确：`chmod 600 ~/.ssh/id_rsa`
- [ ] SSH 目录权限正确：`chmod 700 ~/.ssh`

### 腾讯云服务器

- [ ] SSH 目录已创建：`~/.ssh/` 存在
- [ ] 公钥已添加：`~/.ssh/authorized_keys` 包含本地公钥
- [ ] 文件权限正确：
  - `~/.ssh` → 700
  - `~/.ssh/authorized_keys` → 600
  - `~/.ssh/id_rsa` → 600（服务器不需要）
- [ ] SSH 服务已启动：`sudo systemctl status ssh`

### 连接测试

- [ ] 无密码 SSH 连接成功：`ssh -i ~/.ssh/id_rsa ubuntu@43.167.164.233`
- [ ] 部署脚本能找到密钥：`./deploy-to-tencent.sh`

---

## 🚀 完整设置流程（3步）

### 步骤 1：生成 SSH 密钥（本地，1分钟）

```bash
# 生成密钥
ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa -N ""

# 查看公钥
cat ~/.ssh/id_rsa.pub
# 复制输出内容（从 ssh-rsa 到最后）
```

### 步骤 2：添加公钥到服务器（腾讯云，2分钟）

```bash
# 在腾讯云 VNC 中执行：

# 创建 SSH 目录
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# 添加公钥
echo "YOUR_PUBLIC_KEY_HERE" >> ~/.ssh/authorized_keys
# 将 YOUR_PUBLIC_KEY_HERE 替换为步骤 1 中复制的公钥内容

# 设置权限
chmod 600 ~/.ssh/authorized_keys

# 验证
cat ~/.ssh/authorized_keys
```

### 步骤 3：测试连接（本地，1分钟）

```bash
# 测试 SSH 连接
ssh -i ~/.ssh/id_rsa ubuntu@43.167.164.233

# 应该无需密码即可连接

# 退出
exit

# 运行部署脚本
cd /Users/admin/VScode/wechat-rss-aggregator
chmod +x deploy-to-tencent.sh
./deploy-to-tencent.sh
```

---

## 💡 安全建议

✅ **推荐做法：**
- 使用 4096 位 RSA 密钥或更强的 Ed25519
- 定期轮换密钥
- 为不同的服务器使用不同的密钥
- 妥善保管私钥
- 使用 SSH 配置文件管理多个服务器

❌ **避免：**
- 在公共网络上传输私钥
- 使用密码短语为空的密钥（除非在安全环境）
- 在代码仓库中提交私钥
- 使用过期或泄露的密钥
- 给他人分享私钥

---

## 📞 快速参考

| 命令 | 说明 |
|------|------|
| `ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa -N ""` | 生成 SSH 密钥 |
| `cat ~/.ssh/id_rsa.pub` | 查看公钥内容 |
| `ssh -i ~/.ssh/id_rsa ubuntu@43.167.164.233` | 用密钥连接服务器 |
| `ssh-copy-id -i ~/.ssh/id_rsa.pub ubuntu@43.167.164.233` | 复制公钥到服务器 |
| `chmod 600 ~/.ssh/id_rsa` | 修复私钥权限 |
| `chmod 700 ~/.ssh` | 修复 SSH 目录权限 |
| `ssh -v ubuntu@43.167.164.233` | 显示详细连接信息（调试用） |

---

**🎯 完成 SSH 密钥配置后，执行部署脚本：**

```bash
cd /Users/admin/VScode/wechat-rss-aggregator
chmod +x deploy-to-tencent.sh
./deploy-to-tencent.sh
```

**预计部署时间：10-15 分钟**
