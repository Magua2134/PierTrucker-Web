document.addEventListener('DOMContentLoaded', function() {
    // 元素引用
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const loginBtn = document.getElementById('loginBtn');
    const checkContainersBtn = document.getElementById('checkContainersBtn');
    const clearDataBtn = document.getElementById('clearDataBtn');
    const addRowBtn = document.getElementById('addRowBtn');
    const containerTableBody = document.getElementById('containerTableBody');
    const statusMessage = document.getElementById('statusMessage');

    // 设置默认登录信息
    emailInput.value = 'nhn05k5aha@iwatermail.com';
    passwordInput.value = '123456aa';

    // 全局变量
    let accessToken = '';
    const appVersion = 2; // 当前版本号
    
    // 计数器
    let successCount = 0;
    let errorCount = 0;
    
    // API基础URL（适配Replit环境）
    // 检查是否在Replit环境中
    const isReplit = window.location.hostname.includes('.repl.co');
    const API_BASE_URL = isReplit 
        ? window.location.origin // 在Replit上使用相同域名
        : ((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') 
            ? 'http://localhost:3000' // 本地开发环境
            : 'https://piertrucker.com'); // 生产环境
    
    console.log('当前API地址:', API_BASE_URL);
    
    // 默认集装箱信息
    const defaultContainers = [
        { place: 'LBE', containerId: 'TRHU7156210' },
        { place: 'LBE', containerId: '2 TRHU7156210' }
    ];
    
    // 地点映射
    const places = {
        'LAAPM': 'laapm',
        'LAETS': 'laets',
        'LAGGS': 'laggs',
        'ITS': 'its',
        'LBC60': 'lbc60',
        'LBPCT': 'lbpct',
        'LBA': 'lba',
        'LBE': 'lbe',
        'LATraPac': 'latrapac',
        'LBT': 'lbt',
        'LAWBCT': 'lawbct',
        'LAYusen': 'layusen'
    };

    // 添加加载中动画到body
    const loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'loading-overlay';
    loadingOverlay.innerHTML = '<div class="spinner-border text-primary loading-spinner" role="status"><span class="visually-hidden">加载中...</span></div>';
    document.body.appendChild(loadingOverlay);

    // 显示加载中动画
    function showLoading() {
        loadingOverlay.classList.add('active');
    }

    // 隐藏加载中动画
    function hideLoading() {
        loadingOverlay.classList.remove('active');
    }

    // 显示状态信息
    function showStatus(message, type = 'info') {
        statusMessage.textContent = message;
        statusMessage.className = `alert alert-${type}`;
        statusMessage.classList.remove('d-none');
        
        // 5秒后自动隐藏
        setTimeout(() => {
            statusMessage.classList.add('d-none');
        }, 5000);
    }

    // 添加新行
    function addNewRow(place = '', containerId = '') {
        const newRow = document.createElement('tr');
        newRow.innerHTML = `
            <td>
                <select class="form-select place-select">
                    <option value="">请选择</option>
                    <option value="LAAPM">T-APM</option>
                    <option value="LAETS">T-ETS</option>
                    <option value="LAGGS">T-FMS</option>
                    <option value="ITS">T-ITS</option>
                    <option value="LBC60">SHIPPER</option>
                    <option value="LBPCT">T-PCT</option>
                    <option value="LBA">T-Pier A</option>
                    <option value="LBE">T-LBCT</option>
                    <option value="LATraPac">T-TraPac</option>
                    <option value="LBT">T-TTI</option>
                    <option value="LAWBCT">T-WBCT</option>
                    <option value="LAYusen">T-YTI</option>
                </select>
            </td>
            <td><input type="text" class="form-control container-id"></td>
            <td class="result"></td>
            <td class="line"></td>
            <td class="size"></td>
            <td class="location"></td>
            <td class="lfd"></td>
            <td class="appt"></td>
        `;
        containerTableBody.appendChild(newRow);
        
        // 如果有预设值，填充
        if (place && containerId) {
            const placeSelect = newRow.querySelector('.place-select');
            const containerInput = newRow.querySelector('.container-id');
            
            placeSelect.value = place;
            containerInput.value = containerId;
        }
        
        return newRow;
    }

    // 清除数据
    function clearData() {
        const rows = containerTableBody.querySelectorAll('tr');
        
        rows.forEach(row => {
            // 删除所有行
            row.remove();
        });
        
        // 添加一个空行
        addNewRow();
        
        // 重置计数器
        updateCounters(0, 0);
        
        showStatus('数据已清空', 'success');
    }

    // 登录函数
    async function login() {
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        
        if (!email || !password) {
            showStatus('请输入邮箱和密码', 'warning');
            return false;
        }
        
        showLoading();
        
        try {
            console.log('尝试登录...');
            // 先检查代理服务器是否正常工作
            try {
                const debugResponse = await fetch(`${API_BASE_URL}/debug`);
                const debugData = await debugResponse.json();
                console.log('代理服务器状态:', debugData);
            } catch (e) {
                console.error('无法连接到代理服务器:', e);
                showStatus('无法连接到代理服务器，请确保代理服务器已启动', 'danger');
                return false;
            }
            
            const formData = new URLSearchParams();
            formData.append('grant_type', 'password');
            formData.append('username', email);
            formData.append('password', password);
            
            const response = await fetch(`${API_BASE_URL}/token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
                },
                body: formData
            });
            
            if (!response.ok) {
                console.error('登录响应错误:', response.status, response.statusText);
                const errorText = await response.text();
                console.error('响应内容:', errorText);
                throw new Error(`HTTP错误 ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.access_token) {
                accessToken = data.access_token;
                checkContainersBtn.disabled = false;
                showStatus('登录成功', 'success');
                
                // 加载默认集装箱
                loadDefaultContainers();
                
                return true;
            } else {
                showStatus('登录失败：' + (data.error_description || '未知错误'), 'danger');
                return false;
            }
        } catch (error) {
            console.error('登录错误:', error);
            showStatus('登录错误：' + error.message, 'danger');
            return false;
        } finally {
            hideLoading();
        }
    }

    // 加载默认集装箱
    function loadDefaultContainers() {
        // 清空现有行
        clearData();
        
        // 添加默认集装箱
        defaultContainers.forEach(container => {
            addNewRow(container.place, container.containerId);
        });
        
        // 自动查询
        if (defaultContainers.length > 0) {
            setTimeout(() => {
                checkAllContainers();
            }, 500);
        }
    }

    // 添加批量输入功能
    function showBatchInputDialog() {
        // 创建模态对话框
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.setAttribute('tabindex', '-1');
        modal.innerHTML = `
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">批量输入集装箱信息</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <p>请按照以下格式输入多个集装箱信息，每行一个：</p>
                        <p class="text-muted">格式：[码头代码] [集装箱号]</p>
                        <p class="text-muted">例如：LBE TRHU7156210</p>
                        <textarea class="form-control" id="batchInput" rows="10"></textarea>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">取消</button>
                        <button type="button" class="btn btn-primary" id="importBatchBtn">导入</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        // 创建Bootstrap模态对象
        const modalObj = new bootstrap.Modal(modal);
        modalObj.show();
        
        // 导入按钮点击事件
        document.getElementById('importBatchBtn').addEventListener('click', () => {
            const batchText = document.getElementById('batchInput').value;
            processBatchInput(batchText);
            modalObj.hide();
            
            // 删除模态对话框
            setTimeout(() => {
                document.body.removeChild(modal);
            }, 500);
        });
    }
    
    // 处理批量输入
    function processBatchInput(batchText) {
        if (!batchText.trim()) {
            showStatus('批量输入为空', 'warning');
            return;
        }
        
        // 清空现有行
        clearData();
        
        // 解析输入
        const lines = batchText.split('\n');
        let validLines = 0;
        
        lines.forEach(line => {
            const trimmedLine = line.trim();
            if (!trimmedLine) return;
            
            // 尝试匹配 "码头 集装箱号" 格式
            const parts = trimmedLine.split(/\s+/);
            if (parts.length >= 2) {
                const place = parts[0].toUpperCase();
                const containerId = parts.slice(1).join(' ');
                
                // 验证码头代码是否有效
                if (places[place]) {
                    addNewRow(place, containerId);
                    validLines++;
                }
            }
        });
        
        if (validLines > 0) {
            showStatus(`成功导入 ${validLines} 个集装箱信息`, 'success');
            // 自动查询
            setTimeout(() => {
                checkAllContainers();
            }, 500);
        } else {
            showStatus('没有有效的集装箱信息', 'warning');
        }
    }

    // 检查版本
    async function checkVersion() {
        try {
            console.log('检查版本...');
            // 由于可能不需要严格的版本检查，在出错时继续允许使用
            try {
                const response = await fetch(`${API_BASE_URL}/api/settings/${appVersion}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP错误 ${response.status}`);
                }
                
                const data = await response.json();
                
                if (appVersion >= data.ExcelVersionMin && appVersion < data.ExcelVersionMax) {
                    showStatus('有新版本可用！请访问 PierTrucker.com -> Dispatch -> Excel 下载。', 'warning');
                }
                
                if (appVersion >= data.ExcelVersionMin && appVersion <= data.ExcelVersionMax) {
                    return true;
                } else {
                    showStatus('需要更新版本！请访问 PierTrucker.com -> Dispatch -> Excel 下载新版本。', 'danger');
                    return false;
                }
            } catch (versionError) {
                console.error('检查版本出错，但将继续执行:', versionError);
                showStatus('版本检查跳过，继续执行', 'warning');
                return true; // 忽略版本检查错误，允许继续使用
            }
        } catch (error) {
            console.error('检查版本错误:', error);
            showStatus('检查版本错误：' + error.message, 'danger');
            return true; // 出错时也返回true，允许继续使用
        }
    }

    // 格式化日期
    function formatDate(dateStr) {
        if (!dateStr) return '';
        try {
            const year = dateStr.substring(0, 4);
            const month = dateStr.substring(5, 7);
            const day = dateStr.substring(8, 10);
            return `${year}-${month}-${day}`;
        } catch (e) {
            console.error('日期格式化错误:', e, dateStr);
            return dateStr;
        }
    }

    // 更新计数器
    function updateCounters(success, error) {
        successCount = success;
        errorCount = error;
        document.getElementById('successCount').textContent = successCount;
        document.getElementById('errorCount').textContent = errorCount;
    }

    // 检查所有集装箱
    async function checkAllContainers() {
        if (!accessToken) {
            const loggedIn = await login();
            if (!loggedIn) return;
        }
        
        // 允许即使版本检查失败也继续
        const versionOk = await checkVersion();
        
        showLoading();
        
        const rows = containerTableBody.querySelectorAll('tr');
        let successCount = 0;
        let errorCount = 0;
        
        for (const row of rows) {
            const placeSelect = row.querySelector('.place-select');
            const containerInput = row.querySelector('.container-id');
            
            const place = placeSelect.value;
            const containerId = containerInput.value.trim();
            
            if (!place || !containerId) continue;
            
            const placeCode = places[place];
            
            try {
                console.log(`查询集装箱: ${placeCode}/${containerId}`);
                const response = await fetch(`${API_BASE_URL}/api/search/${placeCode}/${containerId}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`
                    }
                });
                
                // 处理响应
                const data = await handleApiResponse(response, row);
                
                if (data && data.error) {
                    errorCount++;
                } else {
                    successCount++;
                }
                
            } catch (error) {
                console.error('查询集装箱错误:', error);
                row.querySelector('.result').textContent = `错误: ${error.message}`;
                row.classList.add('error');
                row.classList.remove('success');
                errorCount++;
            }
        }
        
        // 更新计数器
        updateCounters(successCount, errorCount);
        
        hideLoading();
        
        if (errorCount > 0) {
            showStatus(`查询完成: ${successCount} 个成功, ${errorCount} 个失败`, 'warning');
        } else {
            showStatus(`所有 ${successCount} 个集装箱查询成功`, 'success');
        }
    }
    
    // 处理API响应
    async function handleApiResponse(response, row) {
        // 如果响应不成功
        if (response.status !== 200) {
            let errorText;
            try {
                errorText = await response.text();
            } catch (e) {
                errorText = `HTTP错误 ${response.status}`;
            }
            
            console.error(`集装箱查询错误 ${response.status}:`, errorText);
            row.querySelector('.result').textContent = `错误 ${response.status}`;
            row.classList.add('error');
            row.classList.remove('success');
            
            return { error: true, message: errorText };
        }
        
        // 解析JSON响应
        let data;
        try {
            data = await response.json();
            console.log('集装箱查询结果:', data);
            
            // 填充数据并避免显示#Error!
            const resultCell = row.querySelector('.result');
            
            if (data.Result && data.Result.includes('#Error!')) {
                resultCell.textContent = '集装箱未找到';
                row.classList.add('error');
                row.classList.remove('success');
                return { error: true, message: '集装箱未找到' };
            } else {
                resultCell.textContent = data.Result || '';
            }
            
            row.querySelector('.line').textContent = data.Line || '';
            row.querySelector('.size').textContent = data.Size || '';
            row.querySelector('.location').textContent = data.Location || '';
            
            // 安全处理日期
            const lfdCell = row.querySelector('.lfd');
            lfdCell.textContent = data.LFD ? formatDate(data.LFD) : '';
            
            row.querySelector('.appt').textContent = data.Appt || '';
            
            // 添加样式
            if (data.Result) {
                row.classList.add('success');
                row.classList.remove('error');
            }
            
            return data;
            
        } catch (error) {
            console.error('解析查询结果错误:', error);
            row.querySelector('.result').textContent = `解析错误: ${error.message}`;
            row.classList.add('error');
            row.classList.remove('success');
            
            return { error: true, message: error.message };
        }
    }

    // 自动登录函数
    function autoLogin() {
        // 只有当设置了默认值时才自动登录
        if (emailInput.value && passwordInput.value) {
            setTimeout(() => {
                console.log('自动登录...');
                login();
            }, 1000); // 延迟1秒自动登录，确保页面完全加载
        }
    }
    
    // 添加批量导入按钮
    function addBatchInputButton() {
        const batchInputBtn = document.createElement('button');
        batchInputBtn.id = 'batchInputBtn';
        batchInputBtn.className = 'btn btn-outline-success mt-2 ms-2';
        batchInputBtn.textContent = '批量导入';
        
        // 获取添加行按钮并在其后添加批量导入按钮
        const addRowBtnParent = addRowBtn.parentNode;
        addRowBtnParent.insertBefore(batchInputBtn, addRowBtn.nextSibling);
        
        // 添加事件监听器
        batchInputBtn.addEventListener('click', showBatchInputDialog);
    }

    // 事件监听器
    loginBtn.addEventListener('click', login);
    checkContainersBtn.addEventListener('click', checkAllContainers);
    clearDataBtn.addEventListener('click', clearData);
    addRowBtn.addEventListener('click', () => addNewRow());

    // 按Enter键登录
    emailInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') passwordInput.focus();
    });
    
    passwordInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') login();
    });
    
    // 添加批量导入按钮
    addBatchInputButton();

    // 页面加载完成后自动登录
    autoLogin();
    
    // 初始化计数器
    updateCounters(0, 0);
    
    // 初始化时添加一个空行
    if (containerTableBody.querySelectorAll('tr').length === 0) {
        addNewRow();
    }
    
    // 引入Bootstrap模态对话框支持
    const bootstrapScript = document.createElement('script');
    bootstrapScript.src = 'https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/js/bootstrap.bundle.min.js';
    document.body.appendChild(bootstrapScript);
}); 