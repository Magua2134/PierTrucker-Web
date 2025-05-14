// 全局变量
let accessToken = '';
let version = 2; // 当前版本号与VBA代码保持一致
// API基础URL，用于切换本地开发和生产环境
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? '' // 本地开发环境，使用相对路径
    : 'https://piertrucker.com'; // 生产环境，直接访问API

// DOM元素
const loginSection = document.getElementById('loginSection');
const containerSection = document.getElementById('containerSection');
const loginBtn = document.getElementById('loginBtn');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginStatus = document.getElementById('loginStatus');
const containerBody = document.getElementById('containerBody');
const addRowBtn = document.getElementById('addRowBtn');
const checkAllBtn = document.getElementById('checkAllBtn');
const clearBtn = document.getElementById('clearBtn');

// 事件监听器
loginBtn.addEventListener('click', login);
addRowBtn.addEventListener('click', addNewRow);
checkAllBtn.addEventListener('click', checkAllContainers);
clearBtn.addEventListener('click', clearData);

// 函数：登录处理
async function login() {
    try {
        const email = emailInput.value;
        const password = passwordInput.value;
        
        if (!email || !password) {
            showLoginMessage('请输入邮箱和密码', false);
            return;
        }
        
        loginBtn.disabled = true;
        loginBtn.textContent = '登录中...';
        
        // 使用代理服务器发送请求
        const response = await fetch(`${API_BASE_URL}/api/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (data.access_token) {
            accessToken = data.access_token;
            showLoginMessage('登录成功！', true);
            
            // 检查版本
            const versionCheck = await checkVersion();
            if (versionCheck) {
                // 显示容器查询部分
                loginSection.classList.add('hidden');
                containerSection.classList.remove('hidden');
            }
        } else {
            showLoginMessage('登录失败：' + (data.error_description || data.error || '未知错误'), false);
        }
    } catch (error) {
        showLoginMessage('登录请求出错：' + error.message, false);
    } finally {
        loginBtn.disabled = false;
        loginBtn.textContent = '登录';
    }
}

// 函数：显示登录信息
function showLoginMessage(message, isSuccess) {
    loginStatus.textContent = message;
    loginStatus.className = isSuccess ? 'success' : 'error';
}

// 函数：检查版本
async function checkVersion() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/settings/${version}?token=${accessToken}`, {
            method: 'GET'
        });
        
        const data = await response.json();
        
        if (version >= data.ExcelVersionMin && version <= data.ExcelVersionMax) {
            if (version >= data.ExcelVersionMin && version < data.ExcelVersionMax) {
                alert('注意：有新版本可用！请前往 PierTrucker.com -> Dispatch -> Excel 下载最新版本。');
            }
            return true;
        } else {
            alert('必须升级到新版本！请前往 PierTrucker.com -> Dispatch -> Excel 下载最新版本。');
            return false;
        }
    } catch (error) {
        alert('检查版本失败：' + error.message);
        return false;
    }
}

// 函数：添加新行
function addNewRow() {
    const newRow = document.createElement('tr');
    
    newRow.innerHTML = `
        <td>
            <select class="place-select">
                <option value="lbct">LBCT</option>
                <option value="trapac">TraPac</option>
                <option value="wbct">WBCT</option>
                <option value="yti">YTI</option>
                <option value="everport">Everport</option>
                <option value="apm">APM</option>
                <option value="ictf">ICTF</option>
                <option value="lbct2">LBCT 2</option>
            </select>
        </td>
        <td><input type="text" class="container-input"></td>
        <td class="result"></td>
        <td class="line"></td>
        <td class="size"></td>
        <td class="location"></td>
        <td class="lfd"></td>
        <td class="appt"></td>
    `;
    
    containerBody.appendChild(newRow);
}

// 函数：检查所有集装箱
async function checkAllContainers() {
    if (!accessToken) {
        alert('请先登录！');
        return;
    }
    
    checkAllBtn.disabled = true;
    checkAllBtn.textContent = '查询中...';
    
    try {
        const rows = containerBody.querySelectorAll('tr');
        
        for (const row of rows) {
            const placeSelect = row.querySelector('.place-select');
            const containerInput = row.querySelector('.container-input');
            
            const place = placeSelect.value;
            const container = containerInput.value.trim();
            
            if (container) {
                // 清空之前的结果
                row.querySelector('.result').textContent = '查询中...';
                row.querySelector('.line').textContent = '';
                row.querySelector('.size').textContent = '';
                row.querySelector('.location').textContent = '';
                row.querySelector('.lfd').textContent = '';
                row.querySelector('.appt').textContent = '';
                
                // 查询容器状态
                await checkContainer(row, place, container);
            }
        }
    } catch (error) {
        alert('查询出错：' + error.message);
    } finally {
        checkAllBtn.disabled = false;
        checkAllBtn.textContent = '查询所有集装箱';
    }
}

// 函数：检查单个集装箱
async function checkContainer(row, place, container) {
    try {
        const url = `${API_BASE_URL}/api/search/${place}/${container}?token=${accessToken}`;
        
        const response = await fetch(url, {
            method: 'GET'
        });
        
        if (!response.ok) {
            row.querySelector('.result').textContent = `#错误 ${response.status}`;
            return;
        }
        
        const data = await response.json();
        
        // 填充数据到表格
        row.querySelector('.result').textContent = data.Result || '';
        row.querySelector('.line').textContent = data.Line || '';
        row.querySelector('.size').textContent = data.Size || '';
        row.querySelector('.location').textContent = data.Location || '';
        
        // 处理LFD日期格式
        if (data.LFD) {
            const dateParts = data.LFD.split('T')[0].split('-');
            const formattedDate = `${dateParts[0]}-${dateParts[1]}-${dateParts[2]}`;
            row.querySelector('.lfd').textContent = formattedDate;
        } else {
            row.querySelector('.lfd').textContent = '';
        }
        
        row.querySelector('.appt').textContent = data.Appt || '';
        
    } catch (error) {
        row.querySelector('.result').textContent = '查询出错';
        console.error('查询容器出错:', error);
    }
}

// 函数：清除数据
function clearData() {
    const rows = containerBody.querySelectorAll('tr');
    
    for (const row of rows) {
        // 保留第一行，清空内容
        if (row === rows[0]) {
            row.querySelector('.container-input').value = '';
            row.querySelector('.result').textContent = '';
            row.querySelector('.line').textContent = '';
            row.querySelector('.size').textContent = '';
            row.querySelector('.location').textContent = '';
            row.querySelector('.lfd').textContent = '';
            row.querySelector('.appt').textContent = '';
        } else {
            // 删除额外添加的行
            row.remove();
        }
    }
}

// 当页面加载完成后，自动尝试登录
document.addEventListener('DOMContentLoaded', () => {
    // 如果已经有填写的账号密码，可以自动点击登录按钮
    if (emailInput.value && passwordInput.value) {
        loginBtn.click();
    }
}); 