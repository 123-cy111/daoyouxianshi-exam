// 导游测试系统 - 增强版（智能题目管理 + 高级功能）
console.log("系统初始化开始...");

// 全局变量
let currentQuestions = [];
let userAnswers = [];
let currentTestUsedIds = [];
let testHistory = [];
let userPerformance = {
    judgement: { correct: 0, total: 0 },
    single: { correct: 0, total: 0 },
    multiple: { correct: 0, total: 0 }
};

// 计时器相关变量
let timer;
let timeLeft = 120;
let isTimerRunning = false;
let startTime;

// 系统配置
const SYSTEM_CONFIG = {
    totalQuestions: 5,
    timeLimit: 120,
    questionTypes: {
        judgement: 2,
        single: 2,
        multiple: 1
    },
    scoring: {
        judgement: 2,
        single: 2,
        multiple: 2
    }
};

// 移动端检测
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM加载完成");
    console.log("移动端设备:", isMobile);
    
    // 初始化移动端触摸支持
    if (isMobile) {
        initMobileSupport();
    }
    
    // 加载用户数据
    loadUserData();
    
    // 检查题库是否加载
    checkDataLoaded();
});

// 加载用户数据
function loadUserData() {
    try {
        const savedHistory = localStorage.getItem('testHistory');
        const savedPerformance = localStorage.getItem('userPerformance');
        
        if (savedHistory) {
            testHistory = JSON.parse(savedHistory);
            console.log(`加载了 ${testHistory.length} 条历史记录`);
        }
        
        if (savedPerformance) {
            userPerformance = JSON.parse(savedPerformance);
            console.log("加载用户表现数据:", userPerformance);
        }
    } catch (error) {
        console.error("加载用户数据失败:", error);
        // 重置数据
        testHistory = [];
        userPerformance = {
            judgement: { correct: 0, total: 0 },
            single: { correct: 0, total: 0 },
            multiple: { correct: 0, total: 0 }
        };
    }
}

// 保存用户数据
function saveUserData() {
    try {
        localStorage.setItem('testHistory', JSON.stringify(testHistory.slice(-50))); // 保留最近50次
        localStorage.setItem('userPerformance', JSON.stringify(userPerformance));
    } catch (error) {
        console.error("保存用户数据失败:", error);
    }
}

// 完全清除所有题目历史记录
function clearAllQuestionHistory() {
    console.log("清除所有题目历史记录...");
    
    // 清除本地存储中的历史记录
    localStorage.removeItem('usedJudgementIds');
    localStorage.removeItem('usedSingleIds');
    localStorage.removeItem('usedMultipleIds');
    localStorage.removeItem('lastTestTimestamp');
    
    // 重置当前测试记录
    currentTestUsedIds = [];
    
    console.log("所有历史记录已清除");
}

// 智能题目选择算法
function getSmartRandomQuestions() {
    console.log("开始智能随机选择题目...");
    
    try {
        // 计算各类型题目数量
        const { judgement, single, multiple } = SYSTEM_CONFIG.questionTypes;
        
        // 基于用户表现的智能选择（优先选择正确率低的类型）
        const judgementQuestions = selectQuestionsByPerformance('judgement', judgement);
        const singleQuestions = selectQuestionsByPerformance('single', single);
        const multipleQuestions = selectQuestionsByPerformance('multiple', multiple);
        
        const selectedQuestions = [...judgementQuestions, ...singleQuestions, ...multipleQuestions];
        
        // 打乱题目顺序
        const shuffledQuestions = [...selectedQuestions].sort(() => Math.random() - 0.5);
        
        console.log(`智能选择 ${shuffledQuestions.length} 道题目`);
        
        return shuffledQuestions;
        
    } catch (error) {
        console.error("智能选择题目时出错:", error);
        // 降级到普通随机选择
        return getRandomQuestions();
    }
}

// 基于用户表现选择题目
function selectQuestionsByPerformance(type, count) {
    const allQuestions = getQuestionsByType(type);
    const performance = userPerformance[type];
    
    // 如果还没有足够数据，使用完全随机
    if (performance.total < 10) {
        return [...allQuestions].sort(() => Math.random() - 0.5).slice(0, count);
    }
    
    // 计算正确率
    const accuracy = performance.correct / performance.total;
    
    // 如果正确率高，选择更难的题目（如果有难度标记）
    // 这里简化处理，只是完全随机
    const selected = [...allQuestions].sort(() => Math.random() - 0.5).slice(0, count);
    
    // 记录使用的题目ID
    selected.forEach(q => currentTestUsedIds.push({ type, id: q.id }));
    
    return selected;
}

// 根据类型获取题目
function getQuestionsByType(type) {
    switch (type) {
        case 'judgement':
            return judgementQuestions;
        case 'single':
            return singleChoiceQuestions;
        case 'multiple':
            return multipleChoiceQuestions;
        default:
            return [];
    }
}

// 完全随机选择题目（备用方案）
function getRandomQuestions() {
    console.log("使用完全随机选择题目...");
    
    try {
        const { judgement, single, multiple } = SYSTEM_CONFIG.questionTypes;
        
        const randomJudgement = [...judgementQuestions].sort(() => Math.random() - 0.5).slice(0, judgement);
        const randomSingle = [...singleChoiceQuestions].sort(() => Math.random() - 0.5).slice(0, single);
        const randomMultiple = [...multipleChoiceQuestions].sort(() => Math.random() - 0.5).slice(0, multiple);
        
        const selectedQuestions = [...randomJudgement, ...randomSingle, ...randomMultiple];
        
        // 记录使用的题目
        randomJudgement.forEach(q => currentTestUsedIds.push({ type: 'judgement', id: q.id }));
        randomSingle.forEach(q => currentTestUsedIds.push({ type: 'single', id: q.id }));
        randomMultiple.forEach(q => currentTestUsedIds.push({ type: 'multiple', id: q.id }));
        
        console.log(`随机选择 ${selectedQuestions.length} 道题目`);
        
        return selectedQuestions;
        
    } catch (error) {
        console.error("选择题目时出错:", error);
        return [];
    }
}

// 检查数据加载状态
function checkDataLoaded() {
    const checkInterval = setInterval(() => {
        const judgementLoaded = typeof judgementQuestions !== 'undefined' && judgementQuestions.length > 0;
        const singleLoaded = typeof singleChoiceQuestions !== 'undefined' && singleChoiceQuestions.length > 0;
        const multipleLoaded = typeof multipleChoiceQuestions !== 'undefined' && multipleChoiceQuestions.length > 0;
        
        if (judgementLoaded && singleLoaded && multipleLoaded) {
            clearInterval(checkInterval);
            console.log("所有题库加载成功!");
            
            // 显示系统统计信息
            showSystemStats();
            
            // 初始化时完全清除历史记录
            clearAllQuestionHistory();
            generateQuiz();
        } else {
            console.log("等待题库加载...");
        }
    }, 100);
    
    // 10秒后超时
    setTimeout(() => {
        clearInterval(checkInterval);
        const judgementLoaded = typeof judgementQuestions !== 'undefined' && judgementQuestions.length > 0;
        const singleLoaded = typeof singleChoiceQuestions !== 'undefined' && singleChoiceQuestions.length > 0;
        const multipleLoaded = typeof multipleChoiceQuestions !== 'undefined' && multipleChoiceQuestions.length > 0;
        
        if (!judgementLoaded || !singleLoaded || !multipleLoaded) {
            console.error("题库加载超时");
            showErrorMessage("题库加载失败，请刷新页面重试");
        }
    }, 10000);
}

// 显示系统统计信息
function showSystemStats() {
    const totalQuestions = judgementQuestions.length + singleChoiceQuestions.length + multipleChoiceQuestions.length;
    console.log(`系统统计: 判断 ${judgementQuestions.length} 题, 单选 ${singleChoiceQuestions.length} 题, 多选 ${multipleChoiceQuestions.length} 题, 总计 ${totalQuestions} 题`);
    
    // 在页面上显示统计信息
    const statsElement = document.getElementById('system-stats');
    if (statsElement) {
        statsElement.innerHTML = `题库总计: ${totalQuestions} 题 (判断 ${judgementQuestions.length} | 单选 ${singleChoiceQuestions.length} | 多选 ${multipleChoiceQuestions.length})`;
    }
}

// 移动端支持初始化
function initMobileSupport() {
    console.log("初始化移动端支持");
    
    // 防止双击缩放
    let lastTouchEnd = 0;
    document.addEventListener('touchend', function (event) {
        const now = Date.now();
        if (now - lastTouchEnd <= 300) {
            event.preventDefault();
        }
        lastTouchEnd = now;
    }, { passive: false });
    
    // 改善触摸体验
    document.addEventListener('touchstart', function() {}, { passive: true });
}

// 显示错误信息
function showErrorMessage(message) {
    const container = document.getElementById('quiz-container');
    if (container) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px 20px; color: #dc3545;">
                <h3>系统错误</h3>
                <p>${message}</p>
                <button onclick="location.reload()" style="padding: 10px 20px; margin-top: 20px; background: #dc3545; color: white; border: none; border-radius: 5px;">刷新页面</button>
            </div>
        `;
    }
    
    const loadingMessage = document.getElementById('loading-message');
    if (loadingMessage) {
        loadingMessage.innerHTML = `<p style="color: red;">${message}</p>`;
    }
}

// 生成测验界面
function generateQuiz() {
    console.log("开始生成测验界面...");
    
    try {
        // 使用智能选择或完全随机
        currentQuestions = getSmartRandomQuestions();
        
        if (currentQuestions.length === 0) {
            showErrorMessage("无法获取题目，请检查数据文件");
            return;
        }
        
        userAnswers = new Array(currentQuestions.length).fill('');
        startTime = Date.now();
        
        const container = document.getElementById('quiz-container');
        const loadingMessage = document.getElementById('loading-message');
        
        if (!container) {
            console.error("错误: 找不到quiz-container元素");
            return;
        }
        
        // 清空容器
        container.innerHTML = '';
        
        // 隐藏加载消息
        if (loadingMessage) {
            loadingMessage.style.display = 'none';
        }
        
        // 更新分数和进度显示
        updateScoreDisplay(0);
        updateProgressDisplay(0);
        
        // 启动计时器
        startTimer();
        
        console.log(`准备显示 ${currentQuestions.length} 道题目`);
        
        // 生成题目
        currentQuestions.forEach((question, index) => {
            const questionDiv = createQuestionElement(question, index);
            container.appendChild(questionDiv);
        });
        
        // 添加快速操作按钮
        addQuickActions();
        
        console.log("题目生成完成");
        
    } catch (error) {
        console.error("生成测验时出错:", error);
        showErrorMessage("系统初始化失败: " + error.message);
    }
}

// 创建题目元素
function createQuestionElement(question, index) {
    const questionDiv = document.createElement('div');
    questionDiv.className = 'question';
    questionDiv.id = `q${index}`;
    
    const questionType = getQuestionType(question);
    const typeBadge = getTypeBadge(questionType);
    
    if (question.options) {
        // 单选题或多选题
        const isMultiple = question.answer.length > 1;
        const inputType = isMultiple ? 'checkbox' : 'radio';
        
        questionDiv.innerHTML = `
            <div class="question-header">
                <strong>第${index + 1}题</strong>
                ${typeBadge}
            </div>
            <p>${question.question}</p>
            <div class="options">
                ${question.options.map(option => `
                    <label class="option">
                        <input type="${inputType}" name="q${index}" value="${option.charAt(0)}" onchange="updateAnswer(${index})">
                        <span class="option-text">${option}</span>
                    </label>
                `).join('')}
            </div>
            <div class="answer" id="answer${index}" style="display:none;"></div>
            <div class="hint" id="hint${index}" style="display:none;"></div>
        `;
    } else {
        // 判断题
        questionDiv.innerHTML = `
            <div class="question-header">
                <strong>第${index + 1}题</strong>
                ${typeBadge}
            </div>
            <p>${question.question}</p>
            <div class="options">
                <label class="option">
                    <input type="radio" name="q${index}" value="A" onchange="updateAnswer(${index})">
                    <span class="option-text">正确</span>
                </label>
                <label class="option">
                    <input type="radio" name="q${index}" value="B" onchange="updateAnswer(${index})">
                    <span class="option-text">错误</span>
                </label>
            </div>
            <div class="answer" id="answer${index}" style="display:none;"></div>
            <div class="hint" id="hint${index}" style="display:none;"></div>
        `;
    }
    
    return questionDiv;
}

// 获取题目类型
function getQuestionType(question) {
    if (!question.options) return 'judgement';
    return question.answer.length > 1 ? 'multiple' : 'single';
}

// 获取类型徽章
function getTypeBadge(type) {
    const badges = {
        judgement: '<span class="badge judgement-badge">判断题</span>',
        single: '<span class="badge single-badge">单选题</span>',
        multiple: '<span class="badge multiple-badge">多选题</span>'
    };
    return badges[type] || '';
}

// 添加快速操作按钮
function addQuickActions() {
    const container = document.getElementById('quiz-container');
    if (!container) return;
    
    const quickActions = document.createElement('div');
    quickActions.className = 'quick-actions';
    quickActions.innerHTML = `
        <button onclick="clearAllSelections()" class="quick-btn">清除所有选择</button>
        <button onclick="markForReview()" class="quick-btn">标记复查</button>
    `;
    
    container.appendChild(quickActions);
}

// 快速操作：清除所有选择
function clearAllSelections() {
    currentQuestions.forEach((_, index) => {
        const inputs = document.querySelectorAll(`input[name="q${index}"]`);
        inputs.forEach(input => {
            input.checked = false;
        });
        userAnswers[index] = '';
    });
    updateProgressDisplay(0);
}

// 快速操作：标记复查
function markForReview() {
    const unanswered = [];
    userAnswers.forEach((answer, index) => {
        if (!answer || answer === '') {
            unanswered.push(index + 1);
        }
    });
    
    if (unanswered.length > 0) {
        alert(`以下题目未作答: ${unanswered.join(', ')}`);
    } else {
        alert('所有题目都已作答！');
    }
}

// 计时器函数
function startTimer() {
    timeLeft = SYSTEM_CONFIG.timeLimit;
    isTimerRunning = true;
    
    updateTimerDisplay();
    
    if (timer) {
        clearInterval(timer);
    }
    
    timer = setInterval(function() {
        timeLeft--;
        updateTimerDisplay();
        
        if (timeLeft <= 0) {
            clearInterval(timer);
            isTimerRunning = false;
            timeUp();
        }
    }, 1000);
}

// 更新计时器显示
function updateTimerDisplay() {
    const timerElement = document.getElementById('time-left');
    const timerContainer = document.querySelector('.timer');
    
    if (!timerElement) return;
    
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    timerElement.textContent = timeString;
    
    // 根据剩余时间改变样式
    if (timeLeft <= 30) {
        timerContainer.className = 'timer danger';
    } else if (timeLeft <= 60) {
        timerContainer.className = 'timer warning';
    } else {
        timerContainer.className = 'timer';
    }
}

// 时间到处理
function timeUp() {
    // 显示时间到提示
    showNotification("时间到！系统将自动提交您的答案。", 'warning');
    
    // 自动提交答案
    setTimeout(() => {
        checkAnswers();
    }, 1000);
    
    // 禁用所有输入
    document.querySelectorAll('input').forEach(input => {
        input.disabled = true;
    });
    
    // 禁用按钮
    const submitBtn = document.getElementById('submit-btn');
    const resetBtn = document.getElementById('reset-btn');
    
    if (submitBtn) submitBtn.disabled = true;
    if (resetBtn) resetBtn.disabled = true;
}

// 显示通知
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === 'warning' ? '#ffc107' : '#28a745'};
        color: ${type === 'warning' ? '#212529' : 'white'};
        border-radius: 5px;
        z-index: 1000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// 停止计时器
function stopTimer() {
    if (timer) {
        clearInterval(timer);
        isTimerRunning = false;
    }
}

// 更新分数显示
function updateScoreDisplay(score) {
    const scoreElement = document.getElementById('score');
    if (scoreElement) {
        scoreElement.textContent = score;
    }
}

// 更新进度显示
function updateProgressDisplay(progress) {
    const progressElement = document.getElementById('progress');
    if (progressElement) {
        progressElement.textContent = progress;
    }
}

// 更新用户答案
function updateAnswer(index) {
    try {
        const question = currentQuestions[index];
        
        if (question.options) {
            const isMultiple = question.answer.length > 1;
            
            if (isMultiple) {
                const selected = document.querySelectorAll(`input[name="q${index}"]:checked`);
                userAnswers[index] = Array.from(selected).map(input => input.value).sort().join('');
            } else {
                const selected = document.querySelector(`input[name="q${index}"]:checked`);
                userAnswers[index] = selected ? selected.value : '';
            }
        } else {
            const selected = document.querySelector(`input[name="q${index}"]:checked`);
            userAnswers[index] = selected ? selected.value : '';
        }
        
        const answeredCount = userAnswers.filter(answer => answer !== '').length;
        updateProgressDisplay(answeredCount);
        
    } catch (error) {
        console.error("更新答案时出错:", error);
    }
}

// 检查答案
function checkAnswers() {
    stopTimer();
    
    try {
        let score = 0;
        const results = document.getElementById('results');
        const endTime = Date.now();
        const timeUsed = Math.round((endTime - startTime) / 1000);
        
        if (results) {
            results.innerHTML = '<h3>测试结果：</h3>';
            results.style.display = 'block';
        }
        
        currentQuestions.forEach((question, index) => {
            const userAnswer = userAnswers[index] || '未作答';
            const isCorrect = userAnswer === question.answer;
            const questionType = getQuestionType(question);
            
            // 更新用户表现数据
            userPerformance[questionType].total++;
            if (isCorrect) {
                userPerformance[questionType].correct++;
                score += SYSTEM_CONFIG.scoring[questionType];
            }
            
            const answerDiv = document.getElementById(`answer${index}`);
            if (answerDiv) {
                if (isCorrect) {
                    answerDiv.innerHTML = `<span class="correct">✓ 正确！你的答案：${userAnswer}</span>`;
                } else {
                    answerDiv.innerHTML = `<span class="incorrect">✗ 错误！你的答案：${userAnswer}，正确答案：${question.answer}</span>`;
                }
                answerDiv.style.display = 'block';
            }
        });
        
        // 保存测试历史
        const testRecord = {
            date: new Date().toISOString(),
            score: score,
            total: 10,
            timeUsed: timeUsed,
            timeLeft: timeLeft,
            questions: currentQuestions.map((q, i) => ({
                question: q.question,
                userAnswer: userAnswers[i],
                correctAnswer: q.answer,
                isCorrect: userAnswers[i] === q.answer
            }))
        };
        
        testHistory.push(testRecord);
        saveUserData();
        
        updateScoreDisplay(score);
        
        // 显示详细统计
        showDetailedStats(score, timeUsed);
        
        const hintBtn = document.getElementById('hint-btn');
        if (hintBtn) {
            hintBtn.style.display = 'inline-block';
        }
        
    } catch (error) {
        console.error("检查答案时出错:", error);
        alert("评分时出现错误，请刷新页面重试");
    }
}

// 显示详细统计
function showDetailedStats(score, timeUsed) {
    const results = document.getElementById('results');
    if (!results) return;
    
    const accuracy = ((score / 10) * 100).toFixed(1);
    const timeEfficiency = ((timeUsed / 120) * 100).toFixed(1);
    
    const statsHTML = `
        <div class="stats-grid">
            <div class="stat-item">
                <div class="stat-value">${score}/10</div>
                <div class="stat-label">得分</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${accuracy}%</div>
                <div class="stat-label">正确率</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${timeUsed}秒</div>
                <div class="stat-label">用时</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${timeEfficiency}%</div>
                <div class="stat-label">时间效率</div>
            </div>
        </div>
        <div class="performance-chart">
            <h4>各题型表现</h4>
            <div class="chart-bar">
                <span class="chart-label">判断题</span>
                <div class="chart-track">
                    <div class="chart-fill" style="width: ${calculatePerformanceWidth('judgement')}%"></div>
                </div>
                <span class="chart-value">${calculatePerformance('judgement')}%</span>
            </div>
            <div class="chart-bar">
                <span class="chart-label">单选题</span>
                <div class="chart-track">
                    <div class="chart-fill" style="width: ${calculatePerformanceWidth('single')}%"></div>
                </div>
                <span class="chart-value">${calculatePerformance('single')}%</span>
            </div>
            <div class="chart-bar">
                <span class="chart-label">多选题</span>
                <div class="chart-track">
                    <div class="chart-fill" style="width: ${calculatePerformanceWidth('multiple')}%"></div>
                </div>
                <span class="chart-value">${calculatePerformance('multiple')}%</span>
            </div>
        </div>
    `;
    
    results.innerHTML += statsHTML;
}

// 计算表现百分比
function calculatePerformance(type) {
    const perf = userPerformance[type];
    if (perf.total === 0) return 0;
    return ((perf.correct / perf.total) * 100).toFixed(1);
}

function calculatePerformanceWidth(type) {
    const perf = userPerformance[type];
    if (perf.total === 0) return 0;
    return (perf.correct / perf.total) * 100;
}

// 显示解析
function showHints() {
    try {
        currentQuestions.forEach((question, index) => {
            const hintDiv = document.getElementById(`hint${index}`);
            if (hintDiv && question.hint) {
                hintDiv.innerHTML = `<strong>解析：</strong>${question.hint}`;
                hintDiv.style.display = 'block';
            }
        });
    } catch (error) {
        console.error("显示解析时出错:", error);
    }
}

// 重置测验 - 完全清除记录重新开始
function resetQuiz() {
    if (!confirm('确定要重新开始测试吗？当前进度将丢失！')) {
        return;
    }
    
    stopTimer();
    clearAllQuestionHistory();
    
    try {
        generateQuiz();
        const hintBtn = document.getElementById('hint-btn');
        if (hintBtn) {
            hintBtn.style.display = 'none';
        }
        
        const results = document.getElementById('results');
        if (results) {
            results.style.display = 'none';
        }
        
        document.querySelectorAll('input').forEach(input => {
            input.disabled = false;
        });
        
        const submitBtn = document.getElementById('submit-btn');
        const resetBtn = document.getElementById('reset-btn');
        
        if (submitBtn) submitBtn.disabled = false;
        if (resetBtn) resetBtn.disabled = false;
        
        showNotification("已开始新的测试！", 'info');
        
    } catch (error) {
        console.error("重置测验时出错:", error);
    }
}

// 导出测试结果
function exportResults() {
    const lastTest = testHistory[testHistory.length - 1];
    if (!lastTest) {
        alert("没有可导出的测试结果");
        return;
    }
    
    const dataStr = JSON.stringify(lastTest, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `导游测试_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
}

// 页面可见性变化处理
document.addEventListener('visibilitychange', function() {
    if (!document.hidden) {
        console.log("页面重新激活");
    }
});

// 键盘快捷键
document.addEventListener('keydown', function(e) {
    // Ctrl + Enter 提交答案
    if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        checkAnswers();
    }
    
    // Ctrl + R 重新开始
    if (e.ctrlKey && e.key === 'r') {
        e.preventDefault();
        resetQuiz();
    }
});

console.log("增强版脚本加载完成");