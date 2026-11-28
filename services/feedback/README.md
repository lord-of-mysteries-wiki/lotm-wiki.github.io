# 诡秘之主 WIKI 反馈服务

独立的 Vercel 项目：读者提交反馈后，GitHub App 在组织仓库创建待审核 PR。反馈公开，合并反馈文件不会自动更改词条。

## 本站反馈页

本站 `/feedback/` 使用共享反馈组件嵌入本服务的 `/?embed=1`。读者直接在本站填写和提交；表单只维护于本服务，BotID 与 `/api/feedback` 继续在服务自己的域名内运行，不需要跨域开放提交接口。

嵌入模式隐藏重复标题，自动同步表单高度和本站昼夜模式；独立打开服务仍显示完整表单。高度及主题消息分别校验来源域名与窗口，不传递表单内容。配色与字体复用本站 `source/css/typography.css`，服务构建须能读取仓库根目录下的该文件。

服务地址只维护于站点 `_config.yml` 的 `feedback_service_url`。修改嵌入模式后需分别部署主站与本服务；本地构建不更新线上服务。部署后检查实际主站域名的嵌入加载、桌面/窄屏、昼夜切换及提交结果；服务的响应头须允许本站嵌入。

## 部署配置

在 Vercel 项目设置 Production 环境变量：`GITHUB_APP_ID`、`GITHUB_INSTALLATION_ID` 和 `GITHUB_PRIVATE_KEY`。私钥需为 PKCS#8 PEM；GitHub 下载的私钥可用 `openssl pkcs8 -topk8 -nocrypt -in 原私钥.pem -out 转换后私钥.pem` 转换。不要提交密钥。

在 Vercel Firewall 为 `/api/feedback` 的 POST 请求启用按 IP 限流，建议 10 分钟一次，超出返回 429；启用前不要在主站开放反馈表单。配置仓库 main 分支保护，要求审核且不允许机器人绕过，检查 Actions 不向 PR 提供敏感密钥或写权限。Vercel 需启用项目 OIDC 供 BotID 验证。

部署后在实际本站嵌入页测试正常提交、自动化请求拒绝和限流。创建的测试 PR 请关闭并删除其分支。机器人在创建 PR 失败时尽力清理分支，仍需定期检查残留。限流与 BotID 无法消除分布式滥用，建议监控用量。Vercel 配额和费用以账户方案为准。
