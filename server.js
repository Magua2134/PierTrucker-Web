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

// 登录代理
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const response = await axios({
            method: 'POST',
            url: 'https://piertrucker.com/Token',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
            },
            data: `grant_type=password&username=${encodeURIComponent(email)}&password=${password}`
        });
        
        res.json(response.data);
    } catch (error) {
        res.status(error.response?.status || 500).json({
            error: error.message,
            details: error.response?.data
        });
    }
});

// 版本检查代理
app.get('/api/settings/:version', async (req, res) => {
    try {
        const { version } = req.params;
        const { token } = req.query;
        
        const response = await axios({
            method: 'GET',
            url: `https://piertrucker.com/api/settings/${version}`,
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        res.json(response.data);
    } catch (error) {
        res.status(error.response?.status || 500).json({
            error: error.message,
            details: error.response?.data
        });
    }
});

// 集装箱查询代理
app.get('/api/search/:place/:container', async (req, res) => {
    try {
        const { place, container } = req.params;
        const { token } = req.query;
        
        const response = await axios({
            method: 'GET',
            url: `https://piertrucker.com/api/search/${place}/${container}`,
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        res.json(response.data);
    } catch (error) {
        res.status(error.response?.status || 500).json({
            error: error.message,
            details: error.response?.data
        });
    }
});

// 首页路由
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`服务器已启动，访问地址：http://localhost:${PORT}`);
    console.log('按 Ctrl+C 停止服务器');
}); 