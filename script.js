// 配置
const TARGET_PRICE = 180000;
const TARGET_DATE = new Date('2025-12-31');
const START_DATE = new Date('2024-12-31');
const UPDATE_INTERVAL = 30000; // 30秒更新一次

// 全局变量
let currentPrice = 0;
let priceChart = null;
let historicalData = [];

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    createParticles();
    loadHistoricalData().then(() => {
        initializeChart();
        updateData();
        setInterval(updateData, UPDATE_INTERVAL);
    });
});

// 获取比特币价格数据
async function fetchBitcoinPrice() {
    try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true');
        const data = await response.json();
        return {
            price: data.bitcoin.usd,
            change: data.bitcoin.usd_24h_change
        };
    } catch (error) {
        console.error('获取价格数据失败:', error);
        return null;
    }
}

// 加载历史数据
async function loadHistoricalData() {
    try {
        const endDate = new Date();
        const startDate = new Date(START_DATE);
        
        const response = await fetch(
            `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart/range?vs_currency=usd&from=${Math.floor(startDate.getTime() / 1000)}&to=${Math.floor(endDate.getTime() / 1000)}`
        );
        const data = await response.json();
        
        historicalData = data.prices.map(item => ({
            timestamp: item[0],
            price: item[1]
        }));
    } catch (error) {
        console.error('获取历史数据失败:', error);
        historicalData = [];
    }
}

// 更新数据
async function updateData() {
    const priceData = await fetchBitcoinPrice();
    
    if (!priceData) {
        showError('无法获取实时数据');
        return;
    }

    currentPrice = priceData.price;
    const priceChange = priceData.change;
    
    // 更新界面
    updatePriceDisplay(currentPrice, priceChange);
    updateDifferenceDisplay(currentPrice);
    updateStats(currentPrice);
    updateChart(currentPrice);
    updateLastUpdateTime();
}

// 更新价格显示
function updatePriceDisplay(price, change) {
    const priceElement = document.getElementById('currentPrice');
    const changeElement = document.getElementById('priceChange');
    
    priceElement.textContent = formatCurrency(price);
    changeElement.textContent = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
    changeElement.className = `price-change ${change >= 0 ? 'positive' : 'negative'}`;
}

// 更新差距显示
function updateDifferenceDisplay(price) {
    const difference = TARGET_PRICE - price;
    const percentage = (price / TARGET_PRICE) * 100;
    
    const differenceElement = document.getElementById('priceDifference');
    const percentageElement = document.getElementById('completionPercentage');
    const progressFill = document.getElementById('progressFill');
    
    differenceElement.textContent = formatCurrency(difference);
    percentageElement.textContent = `已完成 ${percentage.toFixed(1)}%`;
    progressFill.style.width = `${Math.min(percentage, 100)}%`;
}

// 更新统计信息
function updateStats(price) {
    const now = new Date();
    const daysRemaining = Math.max(0, Math.ceil((TARGET_DATE - now) / (1000 * 60 * 60 * 24)));
    const percentageComplete = (price / TARGET_PRICE) * 100;
    const dailyGrowthRequired = calculateDailyGrowthRequired(price, daysRemaining);
    
    document.getElementById('daysRemaining').textContent = daysRemaining;
    document.getElementById('dailyGrowthRequired').textContent = `${dailyGrowthRequired.toFixed(2)}%`;
    document.getElementById('completionRate').textContent = `${percentageComplete.toFixed(1)}%`;
}

// 计算日均涨幅需求
function calculateDailyGrowthRequired(currentPrice, daysRemaining) {
    if (daysRemaining <= 0 || currentPrice >= TARGET_PRICE) return 0;
    
    const targetRatio = TARGET_PRICE / currentPrice;
    const dailyRatio = Math.pow(targetRatio, 1 / daysRemaining);
    return (dailyRatio - 1) * 100;
}

// 初始化图表
function initializeChart() {
    const ctx = document.getElementById('priceChart').getContext('2d');
    
    const chartData = prepareChartData();
    
    priceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartData.labels,
            datasets: [{
                label: '历史价格',
                data: chartData.historicalPrices,
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.2,
                pointRadius: 2
            }, {
                label: '预测路径',
                data: chartData.predictedPrices,
                borderColor: '#e74c3c',
                borderWidth: 2,
                borderDash: [5, 3],
                fill: false,
                pointRadius: 0,
                tension: 0.4
            }, {
                label: '目标价格线',
                data: chartData.targetLine,
                borderColor: '#27ae60',
                borderWidth: 2,
                borderDash: [5, 5],
                fill: false,
                pointRadius: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: false,
                    ticks: {
                        callback: function(value) {
                            return '$' + value.toLocaleString();
                        }
                    }
                },
                x: {
                    ticks: {
                        maxTicksLimit: 8
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': $' + context.parsed.y.toLocaleString();
                        }
                    }
                }
            }
        }
    });
}

// 准备图表数据
function prepareChartData() {
    const now = new Date();
    const labels = [];
    const historicalPrices = [];
    const predictedPrices = [];
    const targetLine = [];
    
    // 生成正确的月份标签（从2024年12月到2025年12月，共13个月）
    for (let i = 0; i <= 12; i++) {
        const year = 2024 + Math.floor((11 + i) / 12); // 从2024年12月开始计算
        const month = (11 + i) % 12; // 12月是11，然后循环
        
        const date = new Date(year, month, 1);
        labels.push(date.toLocaleDateString('zh-CN', { 
            year: 'numeric', 
            month: 'short' 
        }));
        
        // 初始化所有数据为null
        historicalPrices.push(null);
        predictedPrices.push(null);
        targetLine.push(null);
    }
    
    // 设置目标价格线
    targetLine[12] = TARGET_PRICE;
    
    return { labels, historicalPrices, predictedPrices, targetLine };
}

// 更新图表数据
function updateChart(currentPrice) {
    if (!priceChart) return;
    
    const now = new Date();
    const currentMonthIndex = calculateMonthIndex(now);
    
    // 清空之前的预测数据
    priceChart.data.datasets[1].data = Array(13).fill(null);
    
    // 如果有历史数据，填充历史价格
    if (historicalData.length > 0) {
        fillHistoricalData();
    }
    
    // 设置当前价格（确保在正确的位置）
    if (currentMonthIndex >= 0 && currentMonthIndex <= 12) {
        priceChart.data.datasets[0].data[currentMonthIndex] = currentPrice;
        
        // 生成预测数据（从当前月份开始到目标月份）
        const monthsRemaining = 12 - currentMonthIndex;
        if (monthsRemaining > 0) {
            const monthlyGrowth = Math.pow(TARGET_PRICE / currentPrice, 1 / monthsRemaining);
            
            // 设置预测路径的起点（当前价格）
            priceChart.data.datasets[1].data[currentMonthIndex] = currentPrice;
            
            // 计算并设置预测路径
            for (let i = 1; i <= monthsRemaining; i++) {
                const futureIndex = currentMonthIndex + i;
                if (futureIndex <= 12) {
                    const predictedPrice = currentPrice * Math.pow(monthlyGrowth, i);
                    priceChart.data.datasets[1].data[futureIndex] = predictedPrice;
                }
            }
        }
        
        // 如果已经达到或超过目标月份，直接显示目标价格
        if (currentMonthIndex >= 12) {
            priceChart.data.datasets[1].data[12] = TARGET_PRICE;
        }
    }
    
    // 设置目标价格线
    priceChart.data.datasets[2].data[12] = TARGET_PRICE;
    
    priceChart.update();
}

// 计算月份索引（从2024年12月开始）
function calculateMonthIndex(date) {
    const startYear = 2024;
    const startMonth = 11; // 12月是11（0-indexed）
    
    const currentYear = date.getFullYear();
    const currentMonth = date.getMonth();
    
    // 计算总月份差
    const months = (currentYear - startYear) * 12 + (currentMonth - startMonth);
    return Math.max(0, Math.min(12, months));
}

// 调试函数：检查月份标签是否正确
function debugMonthLabels() {
    console.log('月份标签检查:');
    for (let i = 0; i <= 12; i++) {
        const year = 2024 + Math.floor((11 + i) / 12);
        const month = (11 + i) % 12;
        const date = new Date(year, month, 1);
        console.log(`索引 ${i}: ${date.toLocaleDateString('zh-CN', { 
            year: 'numeric', 
            month: 'short' 
        })}`);
    }
}

// 填充历史数据
function fillHistoricalData() {
    if (historicalData.length === 0) return;
    
    // 按月分组历史数据，使用每月最高价
    const monthlyData = {};
    historicalData.forEach(item => {
        const date = new Date(item.timestamp);
        const monthIndex = calculateMonthIndex(date);
        if (monthIndex >= 0 && monthIndex <= 12) {
            if (!monthlyData[monthIndex]) {
                monthlyData[monthIndex] = [];
            }
            monthlyData[monthIndex].push(item.price);
        }
    });
    
    // 填充历史价格数据（使用每月最高价）
    Object.keys(monthlyData).forEach(monthIndex => {
        const prices = monthlyData[monthIndex];
        if (prices && prices.length > 0) {
            const maxPrice = Math.max(...prices); // 使用每月最高价
            priceChart.data.datasets[0].data[monthIndex] = maxPrice;
        }
    });
}

// 格式化货币
function formatCurrency(amount) {
    return '$' + amount.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// 更新最后更新时间
function updateLastUpdateTime() {
    const now = new Date();
    document.getElementById('lastUpdate').textContent = 
        now.toLocaleString('zh-CN', { 
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
}

// 显示错误信息
function showError(message) {
    const priceElement = document.getElementById('currentPrice');
    priceElement.textContent = '数据加载失败';
    priceElement.classList.add('pulse');
}

// 创建粒子效果
function createParticles() {
    const particlesContainer = document.getElementById('particles');
    const particleCount = 50;
    
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        
        // 随机位置
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.top = `${Math.random() * 100}%`;
        
        // 随机大小
        const size = Math.random() * 3 + 1;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        
        // 随机颜色
        const colors = ['#48dbfb', '#1dd1a1', '#ff6b6b', '#ff9ff3', '#feca57'];
        particle.style.background = colors[Math.floor(Math.random() * colors.length)];
        
        // 随机动画延迟和持续时间
        particle.style.animationDelay = `${Math.random() * 6}s`;
        particle.style.animationDuration = `${Math.random() * 3 + 4}s`;
        
        particlesContainer.appendChild(particle);
    }
}

// 工具函数：数字格式化
function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}