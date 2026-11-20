# 诡秘之主 WIKI 反馈服务

独立的 Vercel 项目：读者提交反馈后，GitHub App 在组织仓库创建待审核 PR。反馈公开，合并反馈文件不会自动更改词条。

## 部署配置

在 Vercel 项目设置 Production 环境变量：`GITHUB_APP_ID`、`GITHUB_INSTALLATION_ID` 和 `GITHUB_PRIVATE_KEY`。私钥需为 PKCS#8 PEM；GitHub 下载的私钥可用 `openssl pkcs8 -topk8 -nocrypt -in 原私钥.pem -out 转换后私钥.pem` 转换。不要提交密钥。

在 Vercel Firewall 为 `/api/feedback` 的 POST 请求启用按 IP 限流，建议 10 分钟一次，超出返回 429；启用前不要把反馈页面链接到主站。配置仓库 main 分支保护，要求审核且不允许机器人绕过，检查 Actions 不向 PR 提供敏感密钥或写权限。Vercel 需启用项目 OIDC 供 BotID 验证。

部署后在实际 Vercel 页面测试正常提交、自动化请求拒绝和限流，再把主站反馈页链接到该页面。创建的测试 PR 请关闭并删除其分支。机器人在创建 PR 失败时尽力清理分支，仍需定期检查残留。限流与 BotID 无法消除分布式滥用，建议监控用量。Vercel 配额和费用以账户方案为准。
