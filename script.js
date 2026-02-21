(function() {
    // ============================ ДАННЫЕ ============================
    let currentUser = null;
    let usersDB = {};
    let onlineUsers = new Set();
    let usdRate = 70.5;
    let day = 1;

    const businesses = [
        { id: 'b1', name: 'Киоск', price: 5000, income: 200 },
        { id: 'b2', name: 'Кафе', price: 15000, income: 700 },
        { id: 'b3', name: 'Магазин', price: 50000, income: 2500 },
        { id: 'b4', name: 'Ресторан', price: 200000, income: 10000 }
    ];

    let quests = [
        { id: 'q1', title: 'Заработать 10 000 ₽', reward: 100, target: 10000, type: 'rub', progress: 0, completed: false },
        { id: 'q2', title: 'Купить бизнес', reward: 150, target: 1, type: 'business', progress: 0, completed: false },
        { id: 'q3', title: 'Инвестировать 3 раза', reward: 80, target: 3, type: 'invest', progress: 0, completed: false }
    ];

    let verificationRequests = [];
    let cardRequests = [];

    // ============================ ЗАГРУЗКА / СОХРАНЕНИЕ ============================
    function loadDB() {
        try {
            const data = localStorage.getItem('vabank_final');
            if (data) {
                const parsed = JSON.parse(data);
                usersDB = parsed.users || {};
                verificationRequests = parsed.verif || [];
                cardRequests = parsed.cards || [];
                quests = parsed.quests || quests;
            }
        } catch (e) {}

        if (!usersDB['admin']) {
            usersDB['admin'] = {
                username: 'admin',
                pin: '0000',
                fullname: 'Administrator',
                email: 'admin@vabank.ru',
                rub: 1000000,
                usd: 10000,
                credit: 0,
                level: 10,
                xp: 2000,
                businesses: [],
                cards: [],
                verified: true,
                banned: false,
                warnings: 0,
                isAdmin: true,
                history: [],
                createdAt: Date.now()
            };
        }
    }

    function saveDB() {
        localStorage.setItem('vabank_final', JSON.stringify({
            users: usersDB,
            verif: verificationRequests,
            cards: cardRequests,
            quests: quests
        }));
    }

    function saveCurrentUser() {
        if (currentUser) {
            usersDB[currentUser.username] = currentUser;
            saveDB();
            localStorage.setItem('lastUser', currentUser.username);
        }
    }

    // ============================ СПЛЭШ ============================
    setTimeout(() => {
        const splash = document.getElementById('splash-screen');
        if (splash) {
            splash.style.transition = 'opacity 0.5s';
            splash.style.opacity = '0';
            setTimeout(() => {
                splash.style.display = 'none';
                document.getElementById('app').style.display = 'block';
            }, 500);
        } else {
            document.getElementById('app').style.display = 'block';
        }
    }, 300);

    // ============================ DOM ЭЛЕМЕНТЫ ============================
    const authScreen = document.getElementById('auth-screen');
    const mainScreen = document.getElementById('main-screen');
    const balanceRub = document.getElementById('balanceRub');
    const creditRub = document.getElementById('creditRub');
    const balanceUsd = document.getElementById('balanceUsd');
    const displayUsername = document.getElementById('displayUsername');
    const displayLevel = document.getElementById('displayLevel');
    const displayXp = document.getElementById('displayXp');
    const usdRateSpan = document.getElementById('usdRate');
    const verifyBadge = document.getElementById('verifyBadge');
    const cardGradient = document.getElementById('cardGradient');
    const cardHolder = document.getElementById('cardHolder');
    const cardNumber = document.getElementById('cardNumber');
    const cardBalance = document.getElementById('cardBalance');
    const notificationArea = document.getElementById('notification-area');
    const adminPanel = document.getElementById('admin-panel');
    const cashbackSpan = document.getElementById('cashback');

    // ============================ УВЕДОМЛЕНИЯ ============================
    function showMessage(msg, isError = false) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = msg;
        toast.style.background = isError ? '#ffebee' : '#e8f5e8';
        toast.style.color = isError ? '#c0392b' : '#2e7d5e';
        toast.style.padding = '15px 20px';
        toast.style.borderRadius = '30px';
        toast.style.marginBottom = '10px';
        toast.style.boxShadow = '0 10px 20px rgba(0,0,0,0.2)';
        notificationArea.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    // ============================ ЗАКРЫТИЕ МОДАЛОК ============================
    function closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
    }

    document.querySelectorAll('.close').forEach(close => {
        close.addEventListener('click', function(e) {
            e.stopPropagation();
            const modal = this.closest('.modal');
            if (modal) modal.style.display = 'none';
        });
    });

    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) this.style.display = 'none';
        });
    });

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') closeAllModals();
    });

    // ============================ UI ============================
    function updateUI() {
        if (!currentUser) return;

        balanceRub.textContent = currentUser.rub.toLocaleString() + ' ₽';
        creditRub.textContent = currentUser.credit.toLocaleString() + ' ₽';
        balanceUsd.textContent = currentUser.usd.toLocaleString() + ' $';
        displayUsername.textContent = currentUser.username;
        displayLevel.textContent = `Уровень ${currentUser.level || 1}`;
        displayXp.textContent = (currentUser.xp || 0) + ' XP';
        usdRateSpan.textContent = usdRate.toFixed(2);
        if (cardBalance) cardBalance.textContent = currentUser.rub.toLocaleString() + ' ₽';
        if (verifyBadge) verifyBadge.style.display = currentUser.verified ? 'inline' : 'none';
        if (cashbackSpan) cashbackSpan.textContent = Math.floor(currentUser.rub * 0.01) + ' ₽';

        updateCardDisplay();
        if (adminPanel) adminPanel.style.display = currentUser && currentUser.isAdmin ? 'block' : 'none';
    }

    function updateCardDisplay() {
        if (!currentUser) return;
        if (!currentUser.cards || currentUser.cards.length === 0) {
            currentUser.cards = [{
                gradient: 'card-common',
                number: '**** **** **** ' + Math.floor(1000 + Math.random() * 9000),
                holder: (currentUser.fullname || currentUser.username).toUpperCase()
            }];
        }
        const card = currentUser.cards[0];
        if (cardGradient) {
            cardGradient.className = 'card-gradient ' + card.gradient;
            cardHolder.textContent = card.holder;
            cardNumber.textContent = card.number;
        }
    }

    function addXP(amount) {
        if (!currentUser) return;
        currentUser.xp = (currentUser.xp || 0) + amount;
        currentUser.level = 1 + Math.floor((currentUser.xp || 0) / 200);
        if (currentUser.level > 20) currentUser.level = 20;
        checkQuests();
    }

    function checkQuests() {
        if (!currentUser) return;
        quests.forEach(q => {
            if (q.completed) return;
            if (q.type === 'rub' && currentUser.rub >= q.target) {
                q.completed = true;
                currentUser.rub += q.reward * 10;
                addXP(q.reward);
                showMessage(`Квест выполнен: ${q.title} +${q.reward} XP + ${q.reward * 10}₽`);
            }
        });
        updateUI();
        saveCurrentUser();
    }

    // ============================ АВТОРИЗАЦИЯ ============================
    document.getElementById('login-tab-btn')?.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.getElementById('login-tab-btn').classList.add('active');
        document.getElementById('login-form').style.display = 'block';
        document.getElementById('register-form').style.display = 'none';
    });

    document.getElementById('register-tab-btn')?.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.getElementById('register-tab-btn').classList.add('active');
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('register-form').style.display = 'block';
    });

    document.getElementById('login-btn')?.addEventListener('click', () => {
        const username = document.getElementById('login-username').value.trim();
        const pin = document.getElementById('login-pin').value.trim();
        loadDB();
        const user = usersDB[username];
        if (!user || user.pin !== pin) return showMessage('Неверные данные', true);
        if (user.banned) return showMessage('Аккаунт заблокирован', true);

        currentUser = { ...user };
        onlineUsers.add(username);
        authScreen.style.display = 'none';
        mainScreen.style.display = 'block';

        const lastLogin = localStorage.getItem('lastLogin_' + username);
        const today = new Date().toDateString();
        if (lastLogin !== today) {
            currentUser.rub += 500;
            localStorage.setItem('lastLogin_' + username, today);
            showMessage('Ежедневный бонус: +500 ₽');
        }

        updateUI();
        saveCurrentUser();
    });

    document.getElementById('register-btn')?.addEventListener('click', () => {
        const username = document.getElementById('reg-username').value.trim();
        const fullname = document.getElementById('reg-fullname').value.trim();
        const email = document.getElementById('reg-email').value.trim();
        const pin = document.getElementById('reg-pin').value.trim();
        if (!username || !pin || pin.length !== 4) return showMessage('ПИН должен быть 4 цифры', true);
        loadDB();
        if (usersDB[username]) return showMessage('Никнейм занят', true);

        const newUser = {
            username, fullname, email, pin,
            rub: 5000, usd: 0, credit: 0,
            level: 1, xp: 0,
            businesses: [], cards: [],
            verified: false, banned: false, warnings: 0,
            isAdmin: false, history: [],
            createdAt: Date.now()
        };
        usersDB[username] = newUser;
        saveDB();
        showMessage('Аккаунт создан, войдите');
    });

    // ============================ ОСНОВНЫЕ ОПЕРАЦИИ ============================
    document.getElementById('depositBtn')?.addEventListener('click', () => {
        if (!currentUser) return;
        const amount = parseInt(document.getElementById('amountInput')?.value || 1000);
        if (amount <= 0) return showMessage('Сумма должна быть > 0', true);
        currentUser.rub += amount;
        addXP(2);
        saveCurrentUser();
        updateUI();
        showMessage(`+${amount} ₽`);
    });

    document.getElementById('withdrawBtn')?.addEventListener('click', () => {
        if (!currentUser) return;
        const amount = parseInt(document.getElementById('amountInput')?.value || 1000);
        if (amount <= 0) return showMessage('Сумма должна быть > 0', true);
        if (amount > currentUser.rub) return showMessage('Недостаточно рублей', true);
        currentUser.rub -= amount;
        addXP(1);
        saveCurrentUser();
        updateUI();
        showMessage(`-${amount} ₽`);
    });

    document.getElementById('loanBtn')?.addEventListener('click', () => {
        if (!currentUser) return;
        const amount = parseInt(document.getElementById('amountInput')?.value || 1000);
        if (amount <= 0) return showMessage('Сумма должна быть > 0', true);
        if (currentUser.credit > 100000) return showMessage('Кредитный лимит исчерпан', true);
        currentUser.rub += amount;
        currentUser.credit += amount;
        addXP(2);
        saveCurrentUser();
        updateUI();
        showMessage(`Кредит ${amount} ₽`);
    });

    document.getElementById('repayBtn')?.addEventListener('click', () => {
        if (!currentUser) return;
        let amount = parseInt(document.getElementById('amountInput')?.value || 1000);
        if (amount <= 0) return showMessage('Сумма должна быть > 0', true);
        if (amount > currentUser.rub) return showMessage('Недостаточно рублей', true);
        if (amount > currentUser.credit) amount = currentUser.credit;
        currentUser.rub -= amount;
        currentUser.credit -= amount;
        addXP(1);
        saveCurrentUser();
        updateUI();
        showMessage(`Погашено ${amount} ₽`);
    });

    document.getElementById('currencyBtn')?.addEventListener('click', () => {
        if (!currentUser) return;
        const amount = parseInt(document.getElementById('amountInput')?.value || 1000);
        if (amount <= 0) return showMessage('Сумма должна быть > 0', true);
        const currency = document.querySelector('.curr-opt.active')?.dataset.curr || 'RUB';
        if (currency === 'RUB') {
            const rubNeed = amount * usdRate;
            if (currentUser.rub < rubNeed) return showMessage('Недостаточно рублей', true);
            currentUser.rub -= rubNeed;
            currentUser.usd += amount;
        } else {
            if (currentUser.usd < amount) return showMessage('Недостаточно долларов', true);
            currentUser.usd -= amount;
            currentUser.rub += amount * usdRate;
        }
        addXP(3);
        saveCurrentUser();
        updateUI();
        showMessage('Обмен выполнен');
    });

    // ============================ КВЕСТЫ ============================
    document.getElementById('questsBtn')?.addEventListener('click', () => {
        let html = '';
        quests.forEach(q => {
            html += `<div class="quest-item">
                <div class="quest-info">
                    <div class="quest-title">${q.title}</div>
                    <div class="quest-reward">+${q.reward} XP</div>
                </div>
                <span class="quest-progress">${q.completed ? '✅' : (q.progress || 0) + '/' + q.target}</span>
            </div>`;
        });
        document.getElementById('questsList').innerHTML = html;
        document.getElementById('questsModal').style.display = 'flex';
    });

    // ============================ БИЗНЕС ============================
    document.getElementById('businessBtn')?.addEventListener('click', () => {
        let html = '';
        businesses.forEach(b => {
            const owned = currentUser.businesses?.some(bus => bus.id === b.id);
            html += `<div class="business-item">
                <span><i class="fas fa-store"></i> ${b.name} (доход ${b.income} ₽/день)</span>
                <button class="btn-primary" style="width:auto; padding:8px 15px;" onclick="buyBusiness('${b.id}')">${owned ? 'Куплено' : b.price + ' ₽'}</button>
            </div>`;
        });
        document.getElementById('businessList').innerHTML = html;
        document.getElementById('businessModal').style.display = 'flex';
    });

    window.buyBusiness = function(id) {
        const biz = businesses.find(b => b.id === id);
        if (!biz) return;
        if (currentUser.rub < biz.price) return showMessage('Недостаточно рублей', true);
        if (currentUser.businesses?.some(b => b.id === id)) return showMessage('Уже куплено', true);

        if (!currentUser.businesses) currentUser.businesses = [];
        currentUser.rub -= biz.price;
        currentUser.businesses.push({ id: biz.id, name: biz.name, income: biz.income });
        addXP(20);
        saveCurrentUser();
        document.getElementById('businessModal').style.display = 'none';
        updateUI();
        showMessage(`Куплен ${biz.name}`);
    };

    // ============================ ИНВЕСТИЦИИ ============================
    document.getElementById('investBtn')?.addEventListener('click', () => {
        document.getElementById('investModal').style.display = 'flex';
    });

    document.getElementById('investBtnAction')?.addEventListener('click', () => {
        const amount = parseInt(document.getElementById('investAmount').value);
        if (!amount || amount <= 0 || amount > currentUser.rub) return showMessage('Некорректная сумма', true);
        currentUser.rub -= amount;
        const success = Math.random() < 0.5;
        if (success) {
            currentUser.rub += amount * 2;
            showMessage(`Удача! +${amount * 2} ₽`);
        } else {
            showMessage('Неудача, деньги потеряны');
        }
        if (!currentUser.history) currentUser.history = [];
        currentUser.history.push({
            type: 'invest',
            amount: amount,
            result: success ? 'win' : 'loss',
            time: new Date().toLocaleString()
        });
        addXP(5);
        saveCurrentUser();
        updateUI();
        document.getElementById('investModal').style.display = 'none';
    });

    // ============================ КАРТЫ ============================
    document.getElementById('cardsBtn')?.addEventListener('click', () => {
        renderUserCards();
        const canOrder = currentUser.level >= 3 && currentUser.verified && currentUser.rub >= 20000;
        document.getElementById('cardOrderHint').textContent = canOrder
            ? 'Вы можете заказать новую карту'
            : 'Для заказа карты нужны: уровень 3+, верификация, баланс ≥20000 ₽';
        document.getElementById('cardsModal').style.display = 'flex';
    });

    function renderUserCards() {
        let html = '';
        if (currentUser.cards && currentUser.cards.length) {
            currentUser.cards.forEach(card => {
                html += `<div class="mini-card ${card.gradient}">
                    <div class="card-chip"><i class="fas fa-microchip"></i></div>
                    <div class="card-number">${card.number}</div>
                    <div class="card-holder">${card.holder}</div>
                    <div class="card-expiry">12/28</div>
                </div>`;
            });
        } else {
            html = '<p>У вас пока нет карт</p>';
        }
        document.getElementById('cardsList').innerHTML = html;
    }

    document.getElementById('orderCardBtn')?.addEventListener('click', () => {
        if (currentUser.level < 3 || !currentUser.verified || currentUser.rub < 20000) {
            return showMessage('Условия не выполнены', true);
        }
        cardRequests.push({ username: currentUser.username });
        saveDB();
        showMessage('Заявка на карту отправлена администратору');
    });

    // ============================ ПЕРЕВОД ============================
    document.getElementById('transferBtn')?.addEventListener('click', () => {
        document.getElementById('transferModal').style.display = 'flex';
    });

    document.getElementById('transferBtnAction')?.addEventListener('click', () => {
        const to = document.getElementById('transferUsername').value.trim();
        const amount = parseInt(document.getElementById('transferAmount').value);
        if (!to || !amount || amount <= 0) return showMessage('Заполните поля', true);
        if (amount > currentUser.rub) return showMessage('Недостаточно рублей', true);
        if (amount > 50000 && !currentUser.verified) return showMessage('Перевод >50k требует верификации', true);

        loadDB();
        const target = usersDB[to];
        if (!target) return showMessage('Получатель не найден', true);
        if (target.banned) return showMessage('Получатель забанен', true);

        currentUser.rub -= amount;
        target.rub += amount;

        if (!currentUser.history) currentUser.history = [];
        if (!target.history) target.history = [];
        const now = new Date().toLocaleString();
        currentUser.history.push({ type: 'transfer_out', amount, to, time: now });
        target.history.push({ type: 'transfer_in', amount, from: currentUser.username, time: now });

        addXP(5);
        saveCurrentUser();
        saveDB();
        document.getElementById('transferModal').style.display = 'none';
        updateUI();
        showMessage(`Переведено ${amount} ₽ пользователю ${to}`);
    });

    // ============================ ПРОФИЛЬ И ВЕРИФИКАЦИЯ ============================
    document.getElementById('profileBtn')?.addEventListener('click', () => {
        if (currentUser && currentUser.isAdmin) {
            openAdminPanel();
        } else {
            openProfileModal();
        }
    });

    function openProfileModal() {
        if (!currentUser) return;
        document.getElementById('profileUsername').textContent = currentUser.username;
        document.getElementById('profileFullname').textContent = currentUser.fullname || 'Не указано';
        document.getElementById('profileLevel').textContent = currentUser.level;
        document.getElementById('profileXp').textContent = currentUser.xp + ' XP';
        document.getElementById('profileBusinesses').textContent = currentUser.businesses?.length || 0;
        document.getElementById('profileCards').textContent = currentUser.cards?.length || 0;
        document.getElementById('profileVerified').textContent = currentUser.verified ? 'Да' : 'Нет';
        document.getElementById('profileDate').textContent = currentUser.createdAt ? new Date(currentUser.createdAt).toLocaleDateString() : 'Недавно';
        document.getElementById('profileVerifyBadge').style.display = currentUser.verified ? 'inline' : 'none';
        document.getElementById('profileModal').style.display = 'flex';
    }

    document.getElementById('verifyRequestBtn')?.addEventListener('click', () => {
        if (!currentUser.fullname || !currentUser.email) return showMessage('Заполните имя и email', true);
        if (currentUser.level < 5 || (currentUser.businesses?.length || 0) < 2) {
            return showMessage('Для верификации нужны: уровень 5+ и 2+ бизнеса', true);
        }
        verificationRequests.push({ username: currentUser.username });
        saveDB();
        showMessage('Заявка на верификацию отправлена');
        document.getElementById('profileModal').style.display = 'none';
    });

    document.getElementById('editProfileBtn')?.addEventListener('click', () => {
        const newName = prompt('Введите новое имя:', currentUser.fullname || '');
        if (newName !== null) {
            currentUser.fullname = newName;
            saveCurrentUser();
            openProfileModal();
            showMessage('Имя обновлено');
        }
    });

    // ============================ ОНЛАЙН ============================
    document.getElementById('onlineBtn')?.addEventListener('click', () => {
        renderOnline();
        document.getElementById('onlineModal').style.display = 'flex';
    });

    function renderOnline() {
        let html = '';
        onlineUsers.forEach(username => {
            const user = usersDB[username];
            if (user && !user.banned) {
                html += `<div class="online-item">
                    <i class="fas fa-circle" style="color:#2e7d5e;"></i>
                    <span>${username}</span>
                </div>`;
            }
        });
        if (!html) html = '<p>Нет пользователей онлайн</p>';
        document.getElementById('onlineList').innerHTML = html;
    }

    // ============================ АКТИВНОСТЬ ============================
    document.getElementById('activityBtn')?.addEventListener('click', () => {
        updateActivity();
        document.getElementById('activityModal').style.display = 'flex';
    });

    function updateActivity() {
        if (!currentUser) return;
        document.getElementById('totalEarned').textContent = (currentUser.rub + currentUser.usd * usdRate).toLocaleString() + ' ₽';
        document.getElementById('totalOperations').textContent = currentUser.history?.length || 0;

        let businessIncome = 0;
        if (currentUser.businesses) {
            currentUser.businesses.forEach(b => businessIncome += b.income);
        }
        document.getElementById('businessIncome').textContent = businessIncome.toLocaleString() + ' ₽';

        const history = currentUser.history || [];
        const investOps = history.filter(h => h.type === 'invest').length;
        document.getElementById('investCount').textContent = investOps;

        let historyHtml = '';
        if (history.length) {
            history.slice(-10).reverse().forEach(h => {
                historyHtml += `<div class="history-item">${h.time}: ${h.type} ${h.amount}</div>`;
            });
        } else {
            historyHtml = '<p>Нет операций</p>';
        }
        document.getElementById('activityHistory').innerHTML = historyHtml;
    }

    // ============================ ЛИДЕРБОРД ============================
    document.getElementById('leaderboardBtn')?.addEventListener('click', () => {
        renderLeaderboard('rub');
        document.getElementById('leaderboardModal').style.display = 'flex';
    });

    function renderLeaderboard(type) {
        loadDB();
        const users = Object.values(usersDB).filter(u => !u.banned);
        let sorted = [];
        if (type === 'rub') {
            sorted = users.sort((a, b) => b.rub - a.rub);
        } else if (type === 'level') {
            sorted = users.sort((a, b) => b.level - a.level || b.xp - a.xp);
        } else if (type === 'business') {
            sorted = users.sort((a, b) => (b.businesses?.length || 0) - (a.businesses?.length || 0));
        } else if (type === 'invest') {
            sorted = users.sort((a, b) => {
                const aInv = a.history?.filter(h => h.type === 'invest').length || 0;
                const bInv = b.history?.filter(h => h.type === 'invest').length || 0;
                return bInv - aInv;
            });
        }
        let html = '';
        sorted.slice(0, 10).forEach((u, i) => {
            let value = type === 'rub' ? u.rub.toLocaleString() + ' ₽' :
                type === 'level' ? `Ур. ${u.level} (${u.xp} XP)` :
                type === 'business' ? `Бизнесов: ${u.businesses?.length || 0}` :
                `Инвестиций: ${u.history?.filter(h => h.type === 'invest').length || 0}`;
            const rankClass = i === 0 ? 'top-1' : i === 1 ? 'top-2' : i === 2 ? 'top-3' : '';
            html += `<div class="leaderboard-item ${rankClass}">
                <span class="leaderboard-rank">#${i + 1}</span>
                <span class="leaderboard-name">${u.username}</span>
                <span class="leaderboard-value">${value}</span>
            </div>`;
        });
        document.getElementById('leaderboardList').innerHTML = html;
    }

    document.querySelectorAll('.leaderboard-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.leaderboard-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            renderLeaderboard(this.dataset.type);
        });
    });

    // ============================ ПЛАТЕЖИ ============================
    let selectedPayment = null;

    document.getElementById('paymentsBtn')?.addEventListener('click', () => {
        document.getElementById('paymentsModal').style.display = 'flex';
        document.getElementById('paymentDetails').style.display = 'none';
    });

    document.getElementById('paymentsNavBtn')?.addEventListener('click', () => {
        document.getElementById('paymentsModal').style.display = 'flex';
        document.getElementById('paymentDetails').style.display = 'none';
    });

    document.querySelectorAll('.payment-item').forEach(item => {
        item.addEventListener('click', function() {
            selectedPayment = this.dataset.service;
            const serviceName = this.querySelector('span').textContent;
            document.getElementById('selectedService').textContent = `Оплата: ${serviceName}`;
            document.getElementById('paymentDetails').style.display = 'block';
        });
    });

    document.getElementById('payBtn')?.addEventListener('click', () => {
        if (!selectedPayment) return showMessage('Выберите услугу', true);
        const amount = parseInt(document.getElementById('paymentAmount').value);
        if (!amount || amount <= 0) return showMessage('Введите сумму', true);
        if (amount > currentUser.rub) return showMessage('Недостаточно средств', true);

        currentUser.rub -= amount;
        if (!currentUser.history) currentUser.history = [];
        currentUser.history.push({
            type: 'payment',
            amount: amount,
            service: selectedPayment,
            time: new Date().toLocaleString()
        });

        addXP(2);
        saveCurrentUser();
        updateUI();
        showMessage(`Оплачено ${amount} ₽`);
        document.getElementById('paymentsModal').style.display = 'none';
    });

    // ============================ СЛЕДУЮЩИЙ ДЕНЬ ============================
    document.getElementById('nextDayBtn')?.addEventListener('click', () => {
        day++;
        usdRate = +(usdRate * (1 + (Math.random() * 0.06 - 0.03))).toFixed(2);
        if (usdRate < 50) usdRate = 50;
        if (usdRate > 120) usdRate = 120;

        if (currentUser) {
            if (currentUser.businesses && currentUser.businesses.length) {
                currentUser.businesses.forEach(b => {
                    currentUser.rub += b.income;
                });
            }
            const interest = Math.floor(currentUser.rub * 0.0001);
            if (interest > 0) currentUser.rub += interest;
            addXP(1);
            saveCurrentUser();
        }
        updateUI();
        showMessage(`День ${day}, курс $ = ${usdRate} ₽`);
    });

    // ============================ АДМИН-ПАНЕЛЬ ============================
    function openAdminPanel() {
        document.getElementById('adminViewModal').style.display = 'flex';
    }

    document.getElementById('adminAddRub')?.addEventListener('click', () => {
        if (!currentUser || !currentUser.isAdmin) {
            showMessage('Только для администратора', true);
            return;
        }
        const amount = parseInt(document.getElementById('adminAmount')?.value);
        if (!amount || amount <= 0) {
            showMessage('Введите корректную сумму', true);
            return;
        }
        currentUser.rub += amount;
        saveCurrentUser();
        updateUI();
        showMessage(`Выдано себе ${amount} ₽`);
    });

    document.getElementById('adminAddUsd')?.addEventListener('click', () => {
        if (!currentUser || !currentUser.isAdmin) {
            showMessage('Только для администратора', true);
            return;
        }
        const amount = parseInt(document.getElementById('adminAmount')?.value);
        if (!amount || amount <= 0) {
            showMessage('Введите корректную сумму', true);
            return;
        }
        currentUser.usd += amount;
        saveCurrentUser();
        updateUI();
        showMessage(`Выдано себе ${amount} $`);
    });

    document.getElementById('adminViewUser')?.addEventListener('click', () => {
        if (!currentUser || !currentUser.isAdmin) {
            showMessage('Только для администратора', true);
            return;
        }
        const name = document.getElementById('adminSearchUser')?.value.trim();
        if (!name) {
            showMessage('Введите никнейм', true);
            return;
        }

        loadDB();
        const target = usersDB[name];
        if (!target) {
            showMessage(`Пользователь "${name}" не найден`, true);
            return;
        }

        let html = `<div style="background: #f5f7fa; border-radius: 20px; padding: 15px; margin-bottom: 15px;">
            <h4 style="margin-bottom: 10px; color: #1f4a7a;">${target.username} ${target.banned ? '🔨 (ЗАБАНЕН)' : ''}</h4>
            <p><strong>💰 Рубли:</strong> ${target.rub.toLocaleString()} ₽</p>
            <p><strong>💵 Доллары:</strong> ${target.usd.toLocaleString()} $</p>
            <p><strong>💳 Кредит:</strong> ${target.credit.toLocaleString()} ₽</p>
            <p><strong>📊 Уровень:</strong> ${target.level || 1} (${target.xp || 0} XP)</p>
            <p><strong>✅ Верификация:</strong> ${target.verified ? 'Да' : 'Нет'}</p>
            <p><strong>⚠️ Предупреждений:</strong> ${target.warnings || 0}</p>
            <p><strong>🏪 Бизнесов:</strong> ${target.businesses?.length || 0}</p>
            <p><strong>💳 Карт:</strong> ${target.cards?.length || 0}</p>
        </div>`;

        if (target.history && target.history.length) {
            html += '<h4>Последние операции:</h4>';
            target.history.slice(-5).forEach(h => {
                html += `<p>${h.time}: ${h.type} ${h.amount}</p>`;
            });
        }

        document.getElementById('adminViewContent').innerHTML = html;
        document.getElementById('adminViewModal').dataset.viewing = name;
        document.getElementById('adminViewModal').style.display = 'flex';
    });

    document.getElementById('adminBanBtn')?.addEventListener('click', () => {
        if (!currentUser || !currentUser.isAdmin) return;
        const name = document.getElementById('adminViewModal').dataset.viewing;
        if (!name || !usersDB[name]) return;
        usersDB[name].banned = true;
        saveDB();
        showMessage(`Пользователь ${name} забанен`);
        document.getElementById('adminViewModal').style.display = 'none';
    });

    document.getElementById('adminWarnBtn')?.addEventListener('click', () => {
        if (!currentUser || !currentUser.isAdmin) return;
        const name = document.getElementById('adminViewModal').dataset.viewing;
        if (!name) return;
        usersDB[name].warnings = (usersDB[name].warnings || 0) + 1;
        saveDB();
        showMessage(`Предупреждение выдано ${name}`);
    });

    document.getElementById('adminUnbanBtn')?.addEventListener('click', () => {
        if (!currentUser || !currentUser.isAdmin) return;
        const name = document.getElementById('adminViewModal').dataset.viewing;
        if (!name) return;
        usersDB[name].banned = false;
        saveDB();
        showMessage(`Пользователь ${name} разбанен`);
    });

    // ============================ НАВИГАЦИЯ ============================
    document.getElementById('homeBtn')?.addEventListener('click', closeAllModals);
    document.getElementById('leaderboardNavBtn')?.addEventListener('click', () => {
        renderLeaderboard('rub');
        document.getElementById('leaderboardModal').style.display = 'flex';
    });
    document.getElementById('profileNavBtn')?.addEventListener('click', () => {
        if (currentUser && currentUser.isAdmin) {
            openAdminPanel();
        } else {
            openProfileModal();
        }
    });
    document.getElementById('helpBtn')?.addEventListener('click', () => {
        document.getElementById('helpModal').style.display = 'flex';
    });

    // ============================ ИНИЦИАЛИЗАЦИЯ ============================
    loadDB();
    const last = localStorage.getItem('lastUser');
    if (last && usersDB[last] && !usersDB[last].banned) {
        currentUser = usersDB[last];
        onlineUsers.add(currentUser.username);
        authScreen.style.display = 'none';
        mainScreen.style.display = 'block';
        updateUI();
    }

    window.addEventListener('beforeunload', () => {
        if (currentUser) {
            onlineUsers.delete(currentUser.username);
        }
    });
})();