// 주식 데이터를 저장할 배열
let stocks = [];
// 알림 목록
let alerts = [];

// 버전 자동 갱신 (년월일시분 형식)
function updateVersion() {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2); // 마지막 2자리
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    const version = `v${year}${month}${day}${hour}${minute}`;
    
    const versionBadge = document.getElementById('versionBadge');
    if (versionBadge) {
        versionBadge.textContent = version;
    }
}

// 페이지 로드 시 버전 업데이트
updateVersion();
// 매 분마다 버전 업데이트
setInterval(updateVersion, 60 * 1000);

// DOM 요소
const stockInput = document.getElementById('stockInput');
const searchBtn = document.getElementById('searchBtn');
const pinnedStocks = document.getElementById('pinnedStocks');
const latestStock = document.getElementById('latestStock');
const recentStocks = document.getElementById('recentStocks');
const refreshBtn = document.getElementById('refreshBtn');
const errorMessage = document.getElementById('errorMessage');
const loading = document.getElementById('loading');
const alertSymbol = document.getElementById('alertSymbol');
const alertValue = document.getElementById('alertValue');
const alertDirection = document.getElementById('alertDirection');
const addAlertBtn = document.getElementById('addAlertBtn');
const alertsList = document.getElementById('alertsList');

// 주식 API 설정
// 옵션 1: Alpha Vantage (무료 API 키 필요: https://www.alphavantage.co/support/#api-key)
// 옵션 2: Finnhub (무료 API 키 필요: https://finnhub.io/)
// 옵션 3: Yahoo Finance (API 키 불필요, CORS 프록시 사용)

const API_TYPE = 'yahoo'; // 'alphavantage', 'finnhub', 'yahoo' 중 선택
const ALPHA_VANTAGE_API_KEY = 'demo'; // Alpha Vantage 사용 시 여기에 키 입력
const FINNHUB_API_KEY = ''; // Finnhub 사용 시 여기에 키 입력

// 이벤트 리스너
searchBtn.addEventListener('click', handleSearch);
stockInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        handleSearch();
    }
});
refreshBtn.addEventListener('click', refreshAllStocks);
addAlertBtn.addEventListener('click', handleAddAlert);

// 알림 권한 요청 및 확인
async function requestNotificationPermission() {
    if ('Notification' in window) {
        if (Notification.permission === 'default') {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                console.log('알림 권한이 허용되었습니다.');
                // Service Worker 등록 확인
                if ('serviceWorker' in navigator) {
                    try {
                        const registration = await navigator.serviceWorker.ready;
                        console.log('Service Worker 준비 완료:', registration);
                    } catch (error) {
                        console.error('Service Worker 준비 실패:', error);
                    }
                }
            } else {
                console.warn('알림 권한이 거부되었습니다.');
            }
        } else if (Notification.permission === 'granted') {
            console.log('알림 권한이 이미 허용되어 있습니다.');
        } else {
            console.warn('알림 권한이 거부되어 있습니다. 브라우저 설정에서 권한을 허용해주세요.');
        }
    } else {
        console.warn('이 브라우저는 알림을 지원하지 않습니다.');
    }
}

// 페이지 로드 시 알림 권한 확인
window.addEventListener('load', () => {
    requestNotificationPermission();
});

// 검색 처리
async function handleSearch() {
    const symbol = stockInput.value.trim().toUpperCase();
    
    if (!symbol) {
        showError('주식 심볼을 입력해주세요.');
        return;
    }

    // 이미 추가된 주식인지 확인하고, 있으면 데이터만 업데이트
    const existingIndex = stocks.findIndex(s => s.symbol === symbol);
    if (existingIndex !== -1) {
        // 기존 주식의 고정 상태 유지하면서 데이터만 업데이트
        hideError();
        showLoading();
        try {
            const updatedData = await fetchStockData(symbol);
            if (updatedData) {
                const wasPinned = stocks[existingIndex].isPinned;
                updatedData.isPinned = wasPinned;
                stocks[existingIndex] = updatedData;
                saveStocksToStorage();
                renderStocks();
                stockInput.value = '';
            }
        } catch (error) {
            showError('주식 데이터를 업데이트하는데 실패했습니다. ' + error.message);
        } finally {
            hideLoading();
        }
        return;
    }

    hideError();
    showLoading();
    
    try {
        const stockData = await fetchStockData(symbol);
        if (stockData) {
            // isPinned 속성 초기화
            stockData.isPinned = false;
            // 새 주식을 맨 앞에 추가 (고정되지 않은 주식들 중에서)
            const pinnedCount = stocks.filter(s => s.isPinned).length;
            stocks.splice(pinnedCount, 0, stockData);
            saveStocksToStorage();
            renderStocks();
            stockInput.value = '';
        }
    } catch (error) {
        showError('주식 데이터를 가져오는데 실패했습니다. ' + error.message);
    } finally {
        hideLoading();
    }
}

// 주식 데이터 가져오기
async function fetchStockData(symbol) {
    try {
        let stockData = null;

        // API 타입에 따라 다른 API 호출
        if (API_TYPE === 'alphavantage') {
            stockData = await fetchFromAlphaVantage(symbol);
        } else if (API_TYPE === 'finnhub') {
            stockData = await fetchFromFinnhub(symbol);
        } else if (API_TYPE === 'yahoo') {
            stockData = await fetchFromYahooFinance(symbol);
        }

        if (!stockData) {
            throw new Error('주식 데이터를 가져올 수 없습니다.');
        }

        // 등락률이 NaN이거나 유효하지 않은 경우 계산
        if (isNaN(stockData.changePercent) || !isFinite(stockData.changePercent)) {
            if (stockData.price && stockData.previousClose && stockData.previousClose > 0) {
                stockData.changePercent = ((stockData.price - stockData.previousClose) / stockData.previousClose) * 100;
            } else if (stockData.change && stockData.price && stockData.price > 0) {
                stockData.changePercent = (stockData.change / (stockData.price - stockData.change)) * 100;
            } else {
                stockData.changePercent = 0;
            }
        }

        return stockData;
    } catch (error) {
        // 가짜 데이터 대신 에러를 throw하여 사용자에게 명확히 알림
        console.error('주식 데이터 가져오기 실패:', error);
        throw error;
    }
}

// Alpha Vantage API 사용
async function fetchFromAlphaVantage(symbol) {
    if (ALPHA_VANTAGE_API_KEY === 'demo') {
        throw new Error('Alpha Vantage API 키가 필요합니다. app.js 파일에서 ALPHA_VANTAGE_API_KEY를 설정하세요.');
    }

    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data['Error Message']) {
        throw new Error('유효하지 않은 심볼입니다.');
    }

    if (data['Note']) {
        throw new Error('API 호출 제한에 도달했습니다. 잠시 후 다시 시도해주세요.');
    }

    const quote = data['Global Quote'];
    if (!quote || !quote['01. symbol']) {
        throw new Error('주식 데이터를 찾을 수 없습니다.');
    }

    const price = parseFloat(quote['05. price'] || 0);
    const change = parseFloat(quote['09. change'] || 0);
    let changePercent = parseFloat((quote['10. change percent'] || '0%').replace('%', ''));
    
    // changePercent가 NaN이면 계산
    if (isNaN(changePercent) || !isFinite(changePercent)) {
        const previousClose = price - change;
        changePercent = previousClose > 0 ? ((change / previousClose) * 100) : 0;
    }

    return {
        symbol: quote['01. symbol'],
        name: quote['01. symbol'],
        price: price,
        change: change,
        changePercent: changePercent,
        previousClose: price - change,
        high: parseFloat(quote['03. high'] || 0),
        low: parseFloat(quote['04. low'] || 0),
        volume: parseInt(quote['06. volume'] || 0),
        lastUpdate: new Date().toISOString()
    };
}

// Finnhub API 사용
async function fetchFromFinnhub(symbol) {
    if (!FINNHUB_API_KEY) {
        throw new Error('Finnhub API 키가 필요합니다. app.js 파일에서 FINNHUB_API_KEY를 설정하세요.');
    }

    const url = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
        throw new Error(data.error);
    }

    if (!data.c || data.c === 0) {
        throw new Error('주식 데이터를 찾을 수 없습니다.');
    }

    const currentPrice = parseFloat(data.c);
    const previousClose = parseFloat(data.pc || 0);
    const change = currentPrice - previousClose;
    const changePercent = previousClose > 0 ? ((change / previousClose) * 100) : 0;

    return {
        symbol: symbol,
        name: symbol,
        price: currentPrice,
        change: change,
        changePercent: changePercent,
        previousClose: previousClose,
        high: parseFloat(data.h || 0),
        low: parseFloat(data.l || 0),
        volume: parseInt(data.v || 0),
        lastUpdate: new Date(data.t * 1000).toISOString()
    };
}

// Yahoo Finance API 사용 (무료, API 키 불필요, CORS 프록시 필요)
async function fetchFromYahooFinance(symbol) {
    // CORS 프록시를 통해 Yahoo Finance 데이터 가져오기
    // 주의: 프록시 서버는 안정적이지 않을 수 있으므로 프로덕션에서는 다른 API 사용 권장
    const proxyUrl = 'https://api.allorigins.win/get?url=';
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`;
    
    try {
        const response = await fetch(proxyUrl + encodeURIComponent(yahooUrl));
        const proxyData = await response.json();
        const data = JSON.parse(proxyData.contents);

        if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
            throw new Error('주식 데이터를 찾을 수 없습니다.');
        }

        const result = data.chart.result[0];
        const meta = result.meta;
        const quote = result.indicators.quote[0];

        if (!meta || !quote) {
            throw new Error('주식 데이터를 가져올 수 없습니다.');
        }

        const currentPrice = parseFloat(meta.regularMarketPrice || meta.previousClose || 0);
        const previousClose = parseFloat(meta.previousClose || 0);
        const change = currentPrice - previousClose;
        const changePercent = previousClose > 0 ? ((change / previousClose) * 100) : 0;

        // 현재 시간을 로컬 시간으로 저장 (API 시간이 없거나 잘못된 경우 대비)
        const now = new Date();
        let updateTime = now;
        
        // regularMarketTime이 있고 유효한 경우 사용
        if (meta.regularMarketTime) {
            const apiTime = new Date(meta.regularMarketTime * 1000);
            // API 시간이 현재 시간보다 24시간 이상 차이나지 않으면 유효한 것으로 간주
            const timeDiff = Math.abs(now - apiTime);
            if (timeDiff < 24 * 60 * 60 * 1000) {
                updateTime = apiTime;
            }
        }

        return {
            symbol: meta.symbol,
            name: meta.longName || meta.shortName || meta.symbol,
            price: currentPrice,
            change: change,
            changePercent: changePercent,
            previousClose: previousClose,
            high: parseFloat(meta.regularMarketDayHigh || (quote.high && quote.high[quote.high.length - 1]) || 0),
            low: parseFloat(meta.regularMarketDayLow || (quote.low && quote.low[quote.low.length - 1]) || 0),
            volume: parseInt(meta.regularMarketVolume || (quote.volume && quote.volume[quote.volume.length - 1]) || 0),
            lastUpdate: updateTime.toISOString()
        };
    } catch (error) {
        // Yahoo Finance 실패 시 다른 프록시 시도
        throw new Error(`Yahoo Finance API 호출 실패: ${error.message}. 다른 API를 사용하거나 CORS 프록시 설정을 확인하세요.`);
    }
}

// 모든 주식 새로고침
async function refreshAllStocks() {
    if (stocks.length === 0) return;

    hideError();
    showLoading();
    
    try {
        const updatedStocks = await Promise.all(
            stocks.map(async stock => {
                const updated = await fetchStockData(stock.symbol);
                // 고정 상태 유지
                updated.isPinned = stock.isPinned || false;
                return updated;
            })
        );
        stocks = updatedStocks;
        saveStocksToStorage();
        renderStocks();
    } catch (error) {
        showError('주식 데이터를 새로고침하는데 실패했습니다.');
    } finally {
        hideLoading();
    }
}

// 고정된 종목만 새로고침
async function refreshPinnedStocks() {
    const pinnedStocks = stocks.filter(s => s.isPinned);
    if (pinnedStocks.length === 0) return;

    try {
        const updatedPinnedStocks = await Promise.all(
            pinnedStocks.map(async stock => {
                const updated = await fetchStockData(stock.symbol);
                updated.isPinned = true; // 고정 상태 유지
                return updated;
            })
        );

        // 기존 주식 배열에서 고정된 종목만 업데이트
        stocks = stocks.map(stock => {
            const updated = updatedPinnedStocks.find(s => s.symbol === stock.symbol);
            return updated || stock;
        });

        saveStocksToStorage();
        renderStocks();
        // 알림 체크
        checkAlerts();
    } catch (error) {
        console.error('고정 종목 업데이트 실패:', error);
    }
}

// 주식 목록 렌더링
function renderStocks() {
    // 고정된 주식과 고정되지 않은 주식 분리
    const pinned = stocks.filter(s => s.isPinned);
    const unpinned = stocks.filter(s => !s.isPinned);
    
    // 고정된 주식 렌더링 (첫 번째 칸)
    if (pinned.length === 0) {
        pinnedStocks.innerHTML = '<div class="empty-message drop-zone">고정된 종목이 없습니다<br><small>다른 종목을 여기로 드래그하세요</small></div>';
    } else {
        pinnedStocks.innerHTML = pinned.map(stock => renderStockCard(stock, true, true)).join('');
        // 고정 종목에 드래그 이벤트 다시 연결
        setTimeout(() => {
            attachDragEvents();
        }, 10);
    }
    
    // 최신 검색 렌더링 (두 번째 칸) - 고정되지 않은 주식 중 첫 번째
    if (unpinned.length === 0) {
        latestStock.innerHTML = '<div class="empty-message">검색한 종목이 없습니다</div>';
    } else {
        latestStock.innerHTML = renderStockCard(unpinned[0], true, false);
        setTimeout(() => {
            attachDragEvents();
        }, 10);
    }
    
    // 이전 검색 렌더링 (세 번째 칸) - 고정되지 않은 주식 중 나머지
    if (unpinned.length <= 1) {
        recentStocks.innerHTML = '<div class="empty-message drop-zone">검색 기록이 없습니다<br><small>고정 종목을 여기로 드래그하여 고정 해제하세요</small></div>';
    } else {
        recentStocks.innerHTML = unpinned.slice(1).map(stock => renderStockCard(stock, false, false)).join('');
        setTimeout(() => {
            attachDragEvents();
        }, 10);
    }
    
    // 알림 심볼 목록 업데이트
    updateAlertSymbolList();
    
    // 알림 체크
    checkAlerts();
    
    // 드롭 존 다시 설정 (렌더링 후)
    setTimeout(() => {
        setupDropZones();
    }, 50);
}

// 드래그 이벤트 연결 (명시적으로)
function attachDragEvents() {
    document.querySelectorAll('.stock-card[data-symbol]').forEach(card => {
        const symbol = card.getAttribute('data-symbol');
        if (symbol) {
            // 기존 이벤트 제거 후 다시 추가
            card.setAttribute('draggable', 'true');
            card.ondragstart = (e) => handleDragStart(e, symbol);
            card.ondragend = handleDragEnd;
            card.ontouchstart = (e) => handleTouchStart(e, symbol);
            card.ontouchmove = handleTouchMove;
            card.ontouchend = handleTouchEnd;
        }
    });
}

// 주식 카드 렌더링
function renderStockCard(stock, isDetailed, isPinned) {
    if (isDetailed) {
        // 상세 정보 카드
        return `
            <div class="stock-card stock-card-detailed ${isPinned ? 'stock-card-pinned' : ''} draggable="true" 
                 data-symbol="${stock.symbol}" 
                 ondragstart="handleDragStart(event, '${stock.symbol}')"
                 ondragend="handleDragEnd(event)"
                 ontouchstart="handleTouchStart(event, '${stock.symbol}')"
                 ontouchmove="handleTouchMove(event)"
                 ontouchend="handleTouchEnd(event)">
                <button class="pin-btn ${isPinned ? 'pinned' : ''}" onclick="togglePin('${stock.symbol}')" aria-label="${isPinned ? '고정 해제' : '고정'}">
                    ${isPinned ? '📌' : '📍'}
                </button>
                <button class="remove-btn" onclick="removeStock('${stock.symbol}')" aria-label="제거">×</button>
                <div class="stock-header">
                    <div>
                        <div class="stock-name">${stock.name}</div>
                        <div class="stock-symbol">${stock.symbol}</div>
                    </div>
                </div>
                <div class="stock-price">$${formatNumber(stock.price)}</div>
                <div class="stock-change ${getChangeClass(stock.change)}">
                    <span>${stock.change >= 0 ? '▲' : '▼'}</span>
                    <span>${formatNumber(Math.abs(stock.change))} (${formatNumber(Math.abs(stock.changePercent))}%)</span>
                </div>
                <div class="stock-info">
                    <div class="info-item">
                        <div class="info-label">고가</div>
                        <div class="info-value">$${formatNumber(stock.high)}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">저가</div>
                        <div class="info-value">$${formatNumber(stock.low)}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">업데이트</div>
                        <div class="info-value">${formatTime(stock.lastUpdate)}</div>
                    </div>
                    ${isPinned ? `
                    <div class="info-item info-item-full">
                        <div class="info-label">마지막 갱신</div>
                        <div class="info-value">${formatDateTime(stock.lastUpdate)}</div>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
    } else {
        // 요약 정보 카드
        return `
            <div class="stock-card stock-card-summary" 
                 draggable="true"
                 data-symbol="${stock.symbol}"
                 ondragstart="handleDragStart(event, '${stock.symbol}')"
                 ondragend="handleDragEnd(event)"
                 ontouchstart="handleTouchStart(event, '${stock.symbol}')"
                 ontouchmove="handleTouchMove(event)"
                 ontouchend="handleTouchEnd(event)"
                 onclick="if (!isDragging) selectStock('${stock.symbol}')">
                <button class="remove-btn" onclick="event.stopPropagation(); removeStock('${stock.symbol}')" aria-label="제거">×</button>
                <div class="stock-summary-content">
                    <div class="stock-summary-header">
                        <div>
                            <div class="stock-name-small">${stock.name}</div>
                            <div class="stock-symbol-small">${stock.symbol}</div>
                        </div>
                        <div class="stock-price-small">$${formatNumber(stock.price)}</div>
                    </div>
                </div>
            </div>
        `;
    }
}

// 주식 고정/고정 해제
function togglePin(symbol) {
    const stockIndex = stocks.findIndex(s => s.symbol === symbol);
    if (stockIndex !== -1) {
        stocks[stockIndex].isPinned = !stocks[stockIndex].isPinned;
        // 고정된 주식은 맨 앞으로 이동
        if (stocks[stockIndex].isPinned) {
            const stock = stocks.splice(stockIndex, 1)[0];
            stocks.unshift(stock);
        } else {
            // 고정 해제 시 고정되지 않은 주식들 중 맨 앞으로 이동
            const pinnedCount = stocks.filter(s => s.isPinned).length;
            const stock = stocks.splice(stockIndex, 1)[0];
            stocks.splice(pinnedCount, 0, stock);
        }
        saveStocksToStorage();
        renderStocks();
    }
}

// 주식 선택 (요약본 클릭 시 상세 정보로 이동)
function selectStock(symbol) {
    const stockIndex = stocks.findIndex(s => s.symbol === symbol);
    if (stockIndex !== -1 && !stocks[stockIndex].isPinned) {
        // 고정되지 않은 주식만 이동 가능
        const selectedStock = stocks.splice(stockIndex, 1)[0];
        const pinnedCount = stocks.filter(s => s.isPinned).length;
        stocks.splice(pinnedCount, 0, selectedStock);
        saveStocksToStorage();
        renderStocks();
    }
}

// 주식 제거
function removeStock(symbol) {
    stocks = stocks.filter(s => s.symbol !== symbol);
    saveStocksToStorage();
    renderStocks();
}

// 변경 클래스 결정
function getChangeClass(change) {
    if (change > 0) return 'positive';
    if (change < 0) return 'negative';
    return 'neutral';
}

// 숫자 포맷팅
function formatNumber(num) {
    // NaN이나 유효하지 않은 숫자 처리
    if (isNaN(num) || !isFinite(num)) {
        return '0.00';
    }
    return new Intl.NumberFormat('ko-KR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(num);
}

// 시간 포맷팅 (초 단위까지)
function formatTime(isoString) {
    const date = new Date(isoString);
    return date.toLocaleTimeString('ko-KR', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
    });
}

// 날짜와 시간 포맷팅 (고정 종목용)
function formatDateTime(isoString) {
    const date = new Date(isoString);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${month}/${day} ${hours}:${minutes}:${seconds}`;
}

// 에러 메시지 표시
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
}

// 에러 메시지 숨기기
function hideError() {
    errorMessage.style.display = 'none';
}

// 성공 메시지 표시
function showSuccessMessage(message) {
    errorMessage.textContent = message;
    errorMessage.className = 'error-message success-message';
    errorMessage.style.display = 'block';
    setTimeout(() => {
        errorMessage.style.display = 'none';
    }, 3000);
}

// 로딩 표시
function showLoading() {
    loading.style.display = 'block';
}

// 로딩 숨기기
function hideLoading() {
    loading.style.display = 'none';
}

// 알림 추가
function handleAddAlert() {
    const symbol = alertSymbol.value;
    const alertType = document.querySelector('input[name="alertType"]:checked').value;
    const value = parseFloat(alertValue.value);
    const direction = alertDirection.value;

    if (!symbol || !value || isNaN(value)) {
        showError('티커와 목표 값을 입력해주세요.');
        return;
    }

    // 알림 권한 확인
    if ('Notification' in window && Notification.permission !== 'granted') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                addAlert(symbol, alertType, value, direction);
            } else {
                showError('알림 권한이 필요합니다.');
            }
        });
    } else {
        addAlert(symbol, alertType, value, direction);
    }
}

function addAlert(symbol, alertType, value, direction) {
    const stock = stocks.find(s => s.symbol === symbol);
    if (!stock) {
        showError('먼저 해당 종목을 검색해주세요.');
        return;
    }

    const alert = {
        id: Date.now(),
        symbol: symbol,
        name: stock.name,
        alertType: alertType, // 'price' or 'percent'
        value: value,
        direction: direction, // 'above' or 'below'
        currentPrice: stock.price,
        createdAt: new Date().toISOString(),
        triggered: false
    };

    alerts.push(alert);
    saveAlertsToStorage();
    renderAlerts();
    
    // 성공 메시지 표시
    showSuccessMessage(`알림이 등록되었습니다: ${alert.symbol} ${alert.alertType === 'price' ? '가격' : '퍼센트'} ${alert.direction === 'above' ? '≥' : '≤'} ${alert.alertType === 'price' ? `$${formatNumber(alert.value)}` : `${alert.value}%`}`);
    
    // 알림 목록으로 스크롤
    setTimeout(() => {
        alertsList.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        // 새로 추가된 알림 하이라이트
        const newAlertElement = document.querySelector(`[data-alert-id="${alert.id}"]`);
        if (newAlertElement) {
            newAlertElement.classList.add('alert-new');
            setTimeout(() => {
                newAlertElement.classList.remove('alert-new');
            }, 2000);
        }
    }, 100);
    
    // 폼 초기화
    alertValue.value = '';
    alertSymbol.value = '';
    showError(''); // 에러 메시지 제거
}

// 알림 목록 렌더링
function renderAlerts() {
    if (alerts.length === 0) {
        alertsList.innerHTML = '<div class="empty-message">설정된 알림이 없습니다</div>';
        return;
    }

    alertsList.innerHTML = alerts.map(alert => {
        const stock = stocks.find(s => s.symbol === alert.symbol);
        const currentPrice = stock ? stock.price : alert.currentPrice;
        const targetPrice = alert.alertType === 'price' 
            ? alert.value 
            : alert.currentPrice * (1 + (alert.direction === 'above' ? 1 : -1) * alert.value / 100);
        
        const percentChange = alert.alertType === 'percent' 
            ? ((currentPrice - alert.currentPrice) / alert.currentPrice * 100).toFixed(2)
            : null;
        const remainingPercent = alert.alertType === 'percent'
            ? (alert.direction === 'above' 
                ? (alert.value - parseFloat(percentChange)).toFixed(2)
                : (parseFloat(percentChange) + alert.value).toFixed(2))
            : null;
        
        return `
            <div class="alert-item ${alert.triggered ? 'alert-triggered' : ''}" data-alert-id="${alert.id}">
                <div class="alert-header">
                    <div class="alert-symbol">${alert.symbol} <span class="alert-name">${alert.name}</span></div>
                    <button class="alert-remove-btn" onclick="removeAlert(${alert.id})" aria-label="알림 삭제">×</button>
                </div>
                <div class="alert-info">
                    <div class="alert-target">
                        <strong>목표:</strong> ${alert.alertType === 'price' ? '가격' : '퍼센트'} 
                        ${alert.direction === 'above' ? '≥' : '≤'} 
                        ${alert.alertType === 'price' ? `$${formatNumber(alert.value)}` : `${alert.value}%`}
                    </div>
                    <div class="alert-current">
                        <strong>현재:</strong> $${formatNumber(currentPrice)}
                        ${percentChange !== null ? ` <span class="alert-change">(${percentChange > 0 ? '+' : ''}${percentChange}%)</span>` : ''}
                    </div>
                    ${remainingPercent !== null && !alert.triggered ? `
                    <div class="alert-progress">
                        목표까지: ${remainingPercent > 0 ? '+' : ''}${remainingPercent}%
                    </div>
                    ` : ''}
                </div>
                ${alert.triggered ? '<div class="alert-status">✓ 알림 발송됨</div>' : ''}
                <div class="alert-time">등록: ${formatTime(alert.createdAt)}</div>
            </div>
        `;
    }).join('');
}

// 알림 심볼 목록 업데이트
function updateAlertSymbolList() {
    const symbols = stocks.map(s => s.symbol).sort();
    alertSymbol.innerHTML = '<option value="">티커 선택</option>' + 
        symbols.map(s => `<option value="${s}">${s}</option>`).join('');
}

// 알림 체크
function checkAlerts() {
    alerts.forEach(alert => {
        if (alert.triggered) return;

        const stock = stocks.find(s => s.symbol === alert.symbol);
        if (!stock) return;

        const currentPrice = stock.price;
        let targetPrice;
        let shouldTrigger = false;

        if (alert.alertType === 'price') {
            targetPrice = alert.value;
            if (alert.direction === 'above') {
                shouldTrigger = currentPrice >= targetPrice;
            } else {
                shouldTrigger = currentPrice <= targetPrice;
            }
        } else { // percent
            const percentChange = ((currentPrice - alert.currentPrice) / alert.currentPrice) * 100;
            if (alert.direction === 'above') {
                shouldTrigger = percentChange >= alert.value;
            } else {
                shouldTrigger = percentChange <= -alert.value;
            }
        }

        if (shouldTrigger) {
            triggerAlert(alert, currentPrice);
        }
    });
}

// 알림 발송
function triggerAlert(alert, currentPrice) {
    alert.triggered = true;
    saveAlertsToStorage();

    const message = alert.alertType === 'price'
        ? `${alert.symbol}가 $${formatNumber(currentPrice)}에 도달했습니다!`
        : `${alert.symbol}가 ${alert.value}% ${alert.direction === 'above' ? '상승' : '하락'}했습니다!`;

    // 알림 발송 (Service Worker 우선, 브라우저 알림 폴백)
    sendNotification('📈 주식 알림', message, alert.id);

    renderAlerts();
}

// 알림 발송 함수 (Service Worker 우선 - 앱 푸시처럼 작동)
async function sendNotification(title, message, alertId) {
    // Service Worker 알림 (백그라운드에서도 작동, 앱이 닫혀 있어도 작동)
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.ready;
            
            // Service Worker에 직접 알림 발송 요청 (더 안정적)
            if (registration.active) {
                registration.active.postMessage({
                    type: 'TRIGGER_ALERT',
                    title: title,
                    message: message,
                    alertId: alertId
                });
            }
            
            // 직접 알림 발송도 시도
            await registration.showNotification(title, {
                body: message,
                icon: './icon-192.png',
                badge: './icon-192.png',
                tag: `alert-${alertId}`,
                requireInteraction: true,
                vibrate: [200, 100, 200],
                data: {
                    url: window.location.href,
                    alertId: alertId
                },
                actions: [
                    {
                        action: 'view',
                        title: '확인'
                    },
                    {
                        action: 'close',
                        title: '닫기'
                    }
                ]
            });
            console.log('Service Worker 알림 발송 성공 (앱 푸시 모드)');
            return;
        } catch (error) {
            console.error('Service Worker 알림 실패:', error);
        }
    }

    // Service Worker 실패 시 브라우저 알림 사용
    if ('Notification' in window && Notification.permission === 'granted') {
        try {
            new Notification(title, {
                body: message,
                icon: './icon-192.png',
                badge: './icon-192.png',
                tag: `alert-${alertId}`,
                requireInteraction: true
            });
            console.log('브라우저 알림 발송 성공');
        } catch (error) {
            console.error('브라우저 알림 실패:', error);
        }
    } else if ('Notification' in window && Notification.permission === 'default') {
        // 권한이 없으면 요청
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                sendNotification(title, message, alertId);
            } else {
                console.warn('알림 권한이 거부되었습니다.');
            }
        });
    }
}

// 알림 삭제
function removeAlert(alertId) {
    alerts = alerts.filter(a => a.id !== alertId);
    saveAlertsToStorage();
    renderAlerts();
}

// 알림 저장
function saveAlertsToStorage() {
    localStorage.setItem('alerts', JSON.stringify(alerts));
}

// 알림 불러오기
function loadAlertsFromStorage() {
    const saved = localStorage.getItem('alerts');
    if (saved) {
        alerts = JSON.parse(saved);
        renderAlerts();
    }
}

// 로컬 스토리지에 저장
function saveStocksToStorage() {
    localStorage.setItem('stocks', JSON.stringify(stocks));
}

// 로컬 스토리지에서 불러오기
function loadStocksFromStorage() {
    const saved = localStorage.getItem('stocks');
    if (saved) {
        stocks = JSON.parse(saved);
        // 이전 버전 호환성: isPinned 속성이 없으면 false로 설정
        stocks.forEach(stock => {
            if (stock.isPinned === undefined) {
                stock.isPinned = false;
            }
        });
        renderStocks();
    }
}

// 주기적으로 주식 데이터 업데이트 (5분마다)
setInterval(() => {
    if (stocks.length > 0) {
        refreshAllStocks();
    }
}, 5 * 60 * 1000);

// 고정된 종목만 30초마다 자동 업데이트
setInterval(() => {
    refreshPinnedStocks();
}, 30 * 1000);

// 드래그 앤 드롭 변수
let draggedSymbol = null;
let touchStartTime = 0;
let touchStartElement = null;
let isDragging = false;

// 드래그 시작 (마우스)
function handleDragStart(e, symbol) {
    if (e.target.closest('.pin-btn') || e.target.closest('.remove-btn')) {
        e.preventDefault();
        return false;
    }
    draggedSymbol = symbol;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', symbol);
    e.currentTarget.style.opacity = '0.5';
}

// 터치 시작
function handleTouchStart(e, symbol) {
    if (e.target.closest('.pin-btn') || e.target.closest('.remove-btn')) {
        return;
    }
    touchStartTime = Date.now();
    touchStartElement = e.currentTarget;
    draggedSymbol = symbol;
    isDragging = false;
}

// 터치 이동
function handleTouchMove(e) {
    if (!touchStartElement || !draggedSymbol) return;
    
    const touch = e.touches[0];
    const timeDiff = Date.now() - touchStartTime;
    
    // 200ms 이상 누르고 있으면 드래그 시작
    if (timeDiff > 200 && !isDragging) {
        isDragging = true;
        touchStartElement.style.opacity = '0.5';
        touchStartElement.style.transform = 'scale(0.95)';
        e.preventDefault();
    }
}

// 터치 종료
function handleTouchEnd(e) {
    if (!touchStartElement || !draggedSymbol) return;
    
    const touch = e.changedTouches[0];
    const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
    const pinnedZone = elementBelow?.closest('#pinnedStocks');
    const recentZone = elementBelow?.closest('#recentStocks');
    
    if (isDragging) {
        const stockIndex = stocks.findIndex(s => s.symbol === draggedSymbol);
        if (stockIndex !== -1) {
            if (pinnedZone && !stocks[stockIndex].isPinned) {
                // 고정 종목으로 이동
                togglePin(draggedSymbol);
            } else if (recentZone && stocks[stockIndex].isPinned) {
                // 검색 기록으로 이동 (고정 해제)
                togglePin(draggedSymbol);
            }
        }
    }
    
    // 스타일 복원
    if (touchStartElement) {
        touchStartElement.style.opacity = '';
        touchStartElement.style.transform = '';
    }
    
    touchStartElement = null;
    draggedSymbol = null;
    isDragging = false;
}

// 드래그 종료
function handleDragEnd(e) {
    e.currentTarget.style.opacity = '';
}

// 드롭 존 설정
function setupDropZones() {
    const pinnedZone = document.getElementById('pinnedStocks');
    const recentZone = document.getElementById('recentStocks');
    
    // 고정 종목 칸 드롭 존 설정
    pinnedZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        pinnedZone.classList.add('drop-zone-active');
    });
    
    pinnedZone.addEventListener('dragleave', () => {
        pinnedZone.classList.remove('drop-zone-active');
    });
    
    pinnedZone.addEventListener('drop', (e) => {
        e.preventDefault();
        pinnedZone.classList.remove('drop-zone-active');
        
        const symbol = e.dataTransfer.getData('text/plain') || draggedSymbol;
        if (symbol) {
            const stockIndex = stocks.findIndex(s => s.symbol === symbol);
            if (stockIndex !== -1 && !stocks[stockIndex].isPinned) {
                togglePin(symbol);
            }
        }
        
        // 모든 카드의 스타일 복원
        document.querySelectorAll('.stock-card').forEach(card => {
            card.style.opacity = '';
        });
    });
    
    // 검색 기록 칸 드롭 존 설정
    recentZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        recentZone.classList.add('drop-zone-active');
    });
    
    recentZone.addEventListener('dragleave', () => {
        recentZone.classList.remove('drop-zone-active');
    });
    
    recentZone.addEventListener('drop', (e) => {
        e.preventDefault();
        recentZone.classList.remove('drop-zone-active');
        
        const symbol = e.dataTransfer.getData('text/plain') || draggedSymbol;
        if (symbol) {
            const stockIndex = stocks.findIndex(s => s.symbol === symbol);
            if (stockIndex !== -1 && stocks[stockIndex].isPinned) {
                // 고정 해제
                togglePin(symbol);
            }
        }
        
        // 모든 카드의 스타일 복원
        document.querySelectorAll('.stock-card').forEach(card => {
            card.style.opacity = '';
        });
    });
    
    // 터치 드롭 처리 (고정 종목 칸)
    pinnedZone.addEventListener('touchend', (e) => {
        if (draggedSymbol && isDragging) {
            const stockIndex = stocks.findIndex(s => s.symbol === draggedSymbol);
            if (stockIndex !== -1 && !stocks[stockIndex].isPinned) {
                togglePin(draggedSymbol);
            }
            isDragging = false;
            draggedSymbol = null;
        }
    }, { passive: true });
    
    // 터치 드롭 처리 (검색 기록 칸)
    recentZone.addEventListener('touchend', (e) => {
        if (draggedSymbol && isDragging) {
            const stockIndex = stocks.findIndex(s => s.symbol === draggedSymbol);
            if (stockIndex !== -1 && stocks[stockIndex].isPinned) {
                togglePin(draggedSymbol);
            }
            isDragging = false;
            draggedSymbol = null;
        }
    }, { passive: true });
}

// 페이지 로드 시 저장된 주식 불러오기 및 드롭 존 설정
loadStocksFromStorage();
loadAlertsFromStorage();
// DOM이 로드된 후 드롭 존 설정
setTimeout(() => {
    setupDropZones();
}, 100);

// 알림 체크를 주기적으로 실행 (10초마다)
setInterval(() => {
    if (stocks.length > 0 && alerts.length > 0) {
        checkAlerts();
    }
}, 10 * 1000);

// Service Worker와 통신하여 백그라운드 알림 체크
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'CHECK_ALERTS') {
            // Service Worker가 알림 체크를 요청하면 실행
            if (stocks.length > 0 && alerts.length > 0) {
                checkAlerts();
            }
        }
    });
    
    // Service Worker에 알림 발송 요청
    window.sendAlertToServiceWorker = async (title, message, alertId) => {
        if ('serviceWorker' in navigator) {
            const registration = await navigator.serviceWorker.ready;
            registration.active.postMessage({
                type: 'TRIGGER_ALERT',
                title: title,
                message: message,
                alertId: alertId
            });
        }
    };
}

// Background Sync API 사용 (앱이 닫혀 있어도 동기화)
if ('serviceWorker' in navigator && 'sync' in self.registration) {
    async function registerBackgroundSync() {
        try {
            const registration = await navigator.serviceWorker.ready;
            await registration.sync.register('check-alerts-sync');
            console.log('Background Sync 등록 완료');
        } catch (error) {
            console.error('Background Sync 등록 실패:', error);
        }
    }
    
    // 알림이 있을 때 Background Sync 등록
    if (alerts.length > 0) {
        registerBackgroundSync();
    }
}

