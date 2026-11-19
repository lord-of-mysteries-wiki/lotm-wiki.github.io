# 反馈服务部署

反馈服务使用 Cloudflare Workers、Durable Objects、Turnstile 和 GitHub App。读者提交的内容会成为公开 PR 中的文件，维护者应核对事实；合并反馈文件不会自动修改词条。不要将密钥写入仓库或网页。

1. 在 Cloudflare 创建 Turnstile 控件，将域名限制为 `lord-of-mysteries-wiki.github.io`。记录公开的 site key，并保管 secret key。
2. 为组织创建 GitHub App，仅授予仓库 Contents（读写）和 Pull requests（读写）权限，将其安装到 `lotm-wiki.github.io` 仓库。记录 App ID、installation ID，并生成私钥。为仓库 main 分支设置保护，禁止机器人绕过审核或直接推送；检查 Actions 设置，确保反馈 PR 不会获得写权限或敏感 secrets。
3. 安装并登录 Wrangler，在本目录配置 Worker。通过 `wrangler secret put` 分别设置 `GITHUB_APP_ID`、`GITHUB_INSTALLATION_ID`、`GITHUB_PRIVATE_KEY` 和 `TURNSTILE_SECRET`。Worker 使用 PKCS#8 PEM 私钥；GitHub 下载的 RSA 私钥可在本地通过 `openssl pkcs8 -topk8 -nocrypt -in 原私钥.pem -out 转换后私钥.pem` 转换。不要提交这些文件。
4. 执行 `wrangler deploy`。在 `source/js/feedback.js` 填入部署后的 HTTPS Worker 地址和 Turnstile site key，然后构建并部署网站。
5. 从实际站点提交一条测试反馈，确认人机验证、公开 PR、频率限制和维护者审核均正常。处理测试 PR 并删除其分支。

每个来源 IP 限制为 10 分钟一次；这不能完全阻止分布式滥用，建议结合 Cloudflare WAF 限流、监控和费用告警。该服务仅接受正式站点来源；修改域名时须同步修改 Worker 中的来源和 Turnstile 主机名。Worker 遇到故障时不会向读者展示内部错误。机器人创建分支后若创建 PR 失败会尽力清理分支，维护者仍应定期检查残留分支。
