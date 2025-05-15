// 简单的Node.js代理服务器，用于解决跨域问题
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 启用CORS
app.use(cors());

// 解析请求体
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件服务
app.use(express.static(__dirname));

// 设置请求超时时间（30秒）
const TIMEOUT = 30000;

// 格式化日期时间，用于日志
function getTimestamp() {
    return new Date().toISOString();
}

// 打印请求信息
app.use((req, res, next) => {
    console.log(`[${getTimestamp()}] ${req.method} ${req.url}`);
    next();
});

// 登录代理
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        console.log(`[${getTimestamp()}] 登录请求: ${email}`);
        
        if (!email || !password) {
            return res.status(400).json({
                error: "邮箱和密码不能为空"
            });
        }
        
        const response = await axios({
            method: 'POST',
            url: 'https://piertrucker.com/Token',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'User-Agent': 'PierTrucker-Web/1.0'
            },
            data: `grant_type=password&username=${encodeURIComponent(email)}&password=${password}`,
            timeout: TIMEOUT
        });
        
        console.log(`[${getTimestamp()}] 登录响应状态: ${response.status}`);
        console.log(`[${getTimestamp()}] 登录响应数据: `, response.data);
        
        res.json(response.data);
    } catch (error) {
        console.error(`[${getTimestamp()}] 登录错误: ${error.message}`);
        
        // 详细错误信息
        if (error.response) {
            console.error(`[${getTimestamp()}] 错误状态码: ${error.response.status}`);
            console.error(`[${getTimestamp()}] 错误详情: `, error.response.data);
            
            return res.status(error.response.status).json({
                error: error.message,
                details: error.response.data
            });
        }
        
        res.status(500).json({
            error: error.message
        });
    }
});

// 版本检查代理
app.get('/api/settings/:version', async (req, res) => {
    try {
        const { version } = req.params;
        const { token } = req.query;
        
        console.log(`[${getTimestamp()}] 版本检查: ${version}`);
        
        if (!token) {
            return res.status(401).json({
                error: "缺少授权令牌"
            });
        }
        
        const response = await axios({
            method: 'GET',
            url: `https://piertrucker.com/api/settings/${version}`,
            headers: {
                'Authorization': `Bearer ${token}`,
                'User-Agent': 'PierTrucker-Web/1.0',
                'Cache-Control': 'no-cache'
            },
            timeout: TIMEOUT
        });
        
        console.log(`[${getTimestamp()}] 版本检查响应状态: ${response.status}`);
        console.log(`[${getTimestamp()}] 版本检查响应数据: `, response.data);
        
        res.json(response.data);
    } catch (error) {
        console.error(`[${getTimestamp()}] 版本检查错误: ${error.message}`);
        
        if (error.response) {
            console.error(`[${getTimestamp()}] 错误状态码: ${error.response.status}`);
            console.error(`[${getTimestamp()}] 错误详情: `, error.response.data);
            
            return res.status(error.response.status).json({
                error: error.message,
                details: error.response.data
            });
        }
        
        res.status(500).json({
            error: error.message
        });
    }
});

// 集装箱查询代理
app.get('/api/search/:place/:container', async (req, res) => {
    try {
        const { place, container } = req.params;
        const { token } = req.query;
        
        console.log(`[${getTimestamp()}] 查询集装箱: ${place}/${container}`);
        
        if (!token) {
            return res.status(401).json({
                error: "缺少授权令牌"
            });
        }
        
        // 构建完整URL
        const apiUrl = `https://piertrucker.com/api/search/${place}/${container}`;
        console.log(`[${getTimestamp()}] 请求API: ${apiUrl}`);
        
        // 发送请求到PierTrucker API
        const response = await axios({
            method: 'GET',
            url: apiUrl,
            headers: {
                'Authorization': `Bearer ${token}`,
                'User-Agent': 'PierTrucker-Web/1.0',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            },
            timeout: TIMEOUT,
            // 允许返回所有状态码
            validateStatus: null
        });
        
        // 记录响应信息
        console.log(`[${getTimestamp()}] API响应状态: ${response.status}`);
        console.log(`[${getTimestamp()}] API响应头: `, response.headers);
        console.log(`[${getTimestamp()}] API响应数据: `, response.data);
        
        // 将原始状态码和数据发送回客户端
        res.status(response.status).json(response.data);
    } catch (error) {
        console.error(`[${getTimestamp()}] 查询错误: ${error.message}`);
        
        // 检查是否有响应
        if (error.response) {
            console.error(`[${getTimestamp()}] 错误状态码: ${error.response.status}`);
            console.error(`[${getTimestamp()}] 错误详情: `, error.response.data);
            
            // 转发原始错误和状态码
            return res.status(error.response.status).json({
                error: error.message,
                originalError: error.response.data
            });
        } else if (error.request) {
            // 请求已发送但没有收到响应
            console.error(`[${getTimestamp()}] 没有收到响应: `, error.request);
            return res.status(504).json({ error: '请求超时，未收到API响应' });
        } else {
            // 请求设置错误
            return res.status(500).json({ error: '请求配置错误: ' + error.message });
        }
    }
});

// 测试端点
app.get('/api/test', async (req, res) => {
    try {
        const response = await axios({
            method: 'GET',
            url: 'https://piertrucker.com',
            timeout: 5000
        });
        
        res.status(200).json({
            status: 'API可访问',
            statusCode: response.status,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            status: 'API无法访问',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// 首页路由
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 全局错误处理
app.use((err, req, res, next) => {
    console.error(`[${getTimestamp()}] 服务器错误: `, err);
    res.status(500).json({
        error: '服务器内部错误',
        message: err.message
    });
});

// 处理未捕获的异常
process.on('uncaughtException', (err) => {
    console.error(`[${getTimestamp()}] 未捕获的异常: `, err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error(`[${getTimestamp()}] 未处理的Promise拒绝: `, reason);
});

// 启动服务器
app.listen(PORT, '0.0.0.0', () => {
    console.log(`[${getTimestamp()}] 服务器已启动，访问地址：http://localhost:${PORT}`);
    console.log(`[${getTimestamp()}] 按 Ctrl+C 停止服务器`);
}); 