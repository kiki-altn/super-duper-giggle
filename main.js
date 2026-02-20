(function() {
    // --- Состояние игры ---
    let balance = 5000;            // рубли
    let creditDebt = 0;            // кредит в рублях
    let usdBalance = 0;            // доллары
    let usdRate = 70.5;            // курс (сколько рублей за 1 доллар)
    let day = 1;                   // счётчик дней

    // Активные депозиты: массив объектов { amount, endTime, interest, type } 
    // где endTime - таймстемп окончания (в миллисекундах)
    let deposits = [];

    // Достижения (булевы)
    let achFirstLoan = false;
    let achFirstInvest = false;
    let achMillion = false;

    // DOM элементы
    const balanceEl = document.getElementById('balanceDisplay');
    const creditEl = document.getElementById('creditDisplay');
    const usdBalanceEl = document.getElementById('usdBalanceDisplay');
    const usdRateEl = document.getElementById('usdRateDisplay');
    const amountInput = document.getElementById('amountInput');
    const messageBox = document.getElementById('messageBox');
    const dayCounterEl = document.getElementById('dayCounter');
    const depositsContainer = document.getElementById('activeDeposits');
    const achFirstLoanEl = document.getElementById('achFirstLoan');
    const achFirstInvestEl = document.getElementById('achFirstInvest');
    const achMillionEl = document.getElementById('achMillion');

    // Кнопки
    const depositBtn = document.getElementById('depositBtn');
    const withdrawBtn = document.getElementById('withdrawBtn');
    const loanBtn = document.getElementById('loanBtn');
    const repayBtn = document.getElementById('repayBtn');
    const investBtn = document.getElementById('investBtn');
    const buyUsdBtn = document.getElementById('buyUsdBtn');
    const sellUsdBtn = document.getElementById('sellUsdBtn');
    const deposit30Btn = document.getElementById('deposit30Btn');
    const deposit60Btn = document.getElementById('deposit60Btn');
    const deposit120Btn = document.getElementById('deposit120Btn');
    const nextDayBtn = document.getElementById('nextDayBtn');

    // --- Загрузка из localStorage ---
    function loadFromStorage() {
        try {
            const saved = JSON.parse(localStorage.getItem('megabank'));
            if (saved) {
                balance = saved.balance ?? 5000;
                creditDebt = saved.creditDebt ?? 0;
                usdBalance = saved.usdBalance ?? 0;
                usdRate = saved.usdRate ?? 70.5;
                day = saved.day ?? 1;
                deposits = saved.deposits ?? [];
                achFirstLoan = saved.achFirstLoan ?? false;
                achFirstInvest = saved.achFirstInvest ?? false;
                achMillion = saved.achMillion ?? false;
            }
        } catch (e) {
            console.warn('Не удалось загрузить сохранение');
        }
        // Валидация
        if (isNaN(balance) || balance < 0) balance = 5000;
        if (isNaN(creditDebt) || creditDebt < 0) creditDebt = 0;
        if (isNaN(usdBalance) || usdBalance < 0) usdBalance = 0;
        if (isNaN(usdRate) || usdRate < 1) usdRate = 70.5;
        if (isNaN(day) || day < 1) day = 1;
        if (!Array.isArray(deposits)) deposits = [];
        // Отфильтровать просроченные (на случай багов)
        const now = Date.now();
        deposits = deposits.filter(d => d.endTime > now);
    }

    // --- Сохранение ---
    function saveToStorage() {
        try {
            const data = {
                balance, creditDebt, usdBalance, usdRate, day,
                deposits,
                achFirstLoan, achFirstInvest, achMillion
            };
            localStorage.setItem('megabank', JSON.stringify(data));
        } catch (e) {}
    }

    // --- Обновление интерфейса ---
    function updateUI() {
        balanceEl.textContent = balance.toLocaleString() + ' ₽';
        creditEl.textContent = creditDebt.toLocaleString() + ' ₽';
        usdBalanceEl.textContent = usdBalance.toFixed(2) + ' $';
        usdRateEl.textContent = usdRate.toFixed(2) + ' ₽';
        dayCounterEl.textContent = `День ${day}`;

        // Обновление достижений
        achFirstLoanEl.textContent = achFirstLoan ? '✅ Взят первый кредит' : '❌ Взять первый кредит';
        achFirstLoanEl.className = 'achievement-item' + (achFirstLoan ? ' completed' : '');
        achFirstInvestEl.textContent = achFirstInvest ? '✅ Сделана первая инвестиция' : '❌ Сделать первую инвестицию';
        achFirstInvestEl.className = 'achievement-item' + (achFirstInvest ? ' completed' : '');
        achMillionEl.textContent = achMillion ? '✅ Накоплен 1 000 000 ₽' : '❌ Накопить 1 000 000 ₽';
        achMillionEl.className = 'achievement-item' + (achMillion ? ' completed' : '');

        // Проверка миллиона (может выполниться в любой момент)
        if (!achMillion && balance >= 1000000) {
            achMillion = true;
            setMessage('🏆 Достижение разблокировано: Миллионер!');
        }

        renderDeposits();
    }

    // --- Отрисовка активных депозитов ---
    function renderDeposits() {
        if (!depositsContainer) return;
        if (deposits.length === 0) {
            depositsContainer.innerHTML = '<div class="deposit-placeholder">Нет активных вкладов</div>';
            return;
        }
        let html = '';
        const now = Date.now();
        deposits.forEach((dep, idx) => {
            const remaining = Math.max(0, dep.endTime - now);
            const seconds = Math.floor(remaining / 1000);
            const timer = seconds > 0 ? `${seconds} сек` : 'завершается...';
            html += `<div class="deposit-item">
                <span>${dep.amount} ₽ (${dep.interest}%)</span>
                <span class="deposit-timer">${timer}</span>
            </div>`;
        });
        depositsContainer.innerHTML = html;
    }

    // --- Сообщение ---
    function setMessage(text, isSuccess = true) {
        messageBox.textContent = text;
        messageBox.style.background = isSuccess ? 'rgba(60, 140, 80, 0.1)' : 'rgba(200, 70, 70, 0.15)';
        messageBox.style.border = isSuccess ? '1px dashed #2E7D5E' : '1px dashed #B33C3C';
        setTimeout(() => {
            messageBox.style.background = 'rgba(0,0,0,0.02)';
            messageBox.style.border = '1px dashed rgba(0,0,0,0.1)';
        }, 2500);
    }

    // --- Получить сумму из поля ввода ---
    function getInputAmount() {
        let amount = parseFloat(amountInput.value);
        if (isNaN(amount) || amount <= 0) {
            setMessage('⚠️ Введите положительную сумму', false);
            return 0;
        }
        amount = Math.floor(amount);
        if (amount <= 0) {
            setMessage('⚠️ Сумма должна быть больше 0', false);
            return 0;
        }
        return amount;
    }

    // --- Пополнение ---
    function handleDeposit() {
        const amount = getInputAmount();
        if (amount === 0) return;
        balance += amount;
        setMessage(`✅ Баланс пополнен на ${amount} ₽`);
        updateUI();
        saveToStorage();
    }

    // --- Снятие ---
    function handleWithdraw() {
        const amount = getInputAmount();
        if (amount === 0) return;
        if (amount > balance) {
            setMessage('❌ Недостаточно средств', false);
            return;
        }
        balance -= amount;
        setMessage(`💰 Вы сняли ${amount} ₽`);
        updateUI();
        saveToStorage();
    }

    // --- Кредит ---
    function handleLoan() {
        const amount = getInputAmount();
        if (amount === 0) return;
        balance += amount;
        creditDebt += amount;
        if (!achFirstLoan && amount > 0) {
            achFirstLoan = true;
            setMessage('🏆 Достижение: первый кредит!');
        }
        setMessage(`🏦 Кредит ${amount} ₽. Долг: ${creditDebt} ₽`);
        updateUI();
        saveToStorage();
    }

    // --- Погашение кредита ---
    function handleRepay() {
        const amount = getInputAmount();
        if (amount === 0) return;
        if (amount > balance) {
            setMessage('❌ Не хватает денег', false);
            return;
        }
        if (amount > creditDebt) {
            setMessage('❌ Сумма превышает долг', false);
            return;
        }
        balance -= amount;
        creditDebt -= amount;
        setMessage(`💸 Погашено ${amount} ₽. Долг: ${creditDebt} ₽`);
        updateUI();
        saveToStorage();
    }

    // --- Инвестиция (50/50) ---
    function handleInvest() {
        const amount = getInputAmount();
        if (amount === 0) return;
        if (amount > balance) {
            setMessage('❌ Недостаточно для инвестиции', false);
            return;
        }

        balance -= amount;
        const success = Math.random() < 0.5;
        if (success) {
            const win = amount * 2;
            balance += win;
            setMessage(`🎉 Удача! Вы получили ${win} ₽ (+${amount} ₽)`);
        } else {
            setMessage(`😞 Неудача. Потеряно ${amount} ₽`);
        }
        if (!achFirstInvest) {
            achFirstInvest = true;
            setMessage('🏆 Достижение: первая инвестиция!');
        }
        updateUI();
        saveToStorage();
    }

    // --- Покупка долларов ---
    function handleBuyUsd() {
        const rubAmount = getInputAmount();
        if (rubAmount === 0) return;
        if (rubAmount > balance) {
            setMessage('❌ Недостаточно рублей', false);
            return;
        }
        const usdToBuy = rubAmount / usdRate;
        balance -= rubAmount;
        usdBalance += usdToBuy;
        setMessage(`💵 Куплено $${usdToBuy.toFixed(2)} по курсу ${usdRate.toFixed(2)}`);
        updateUI();
        saveToStorage();
    }

    // --- Продажа долларов ---
    function handleSellUsd() {
        // Для продажи используем поле ввода как количество долларов (целое)
        let usdAmount = parseFloat(amountInput.value);
        if (isNaN(usdAmount) || usdAmount <= 0) {
            setMessage('⚠️ Введите положительное количество $', false);
            return;
        }
        if (usdAmount > usdBalance) {
            setMessage('❌ Недостаточно долларов', false);
            return;
        }
        const rubProceeds = usdAmount * usdRate;
        usdBalance -= usdAmount;
        balance += rubProceeds;
        setMessage(`💵 Продано $${usdAmount.toFixed(2)}, получено ${rubProceeds.toFixed(2)} ₽`);
        updateUI();
        saveToStorage();
    }

    // --- Открытие депозита ---
    function openDeposit(seconds, interestPercent) {
        const amount = getInputAmount();
        if (amount === 0) return;
        if (amount > balance) {
            setMessage('❌ Недостаточно средств для вклада', false);
            return;
        }
        balance -= amount;
        const endTime = Date.now() + seconds * 1000;
        deposits.push({
            amount: amount,
            endTime: endTime,
            interest: interestPercent,
            type: `${seconds}sec`
        });
        setMessage(`🏦 Вклад открыт: ${amount} ₽ на ${seconds} сек под ${interestPercent}%`);
        updateUI();
        saveToStorage();
    }

    // --- Обработка завершения депозитов (вызывается каждый день/таймер) ---
    function checkCompletedDeposits() {
        const now = Date.now();
        const completed = deposits.filter(d => d.endTime <= now);
        if (completed.length === 0) return;

        // Удаляем завершённые и начисляем проценты
        deposits = deposits.filter(d => d.endTime > now);
        for (let d of completed) {
            const percent = d.interest / 100;
            const payout = d.amount * (1 + percent);
            balance += payout;
            setMessage(`🏦 Депозит созрел: +${payout.toFixed(2)} ₽ (включая ${d.interest}% профита)`, true);
        }
        updateUI();
        saveToStorage();
    }

    // --- Следующий день ---
    function handleNextDay() {
        day++;

        // Начисление процентов на остаток (0.05% от balance)
        const interest = Math.floor(balance * 0.0005); // 0.05%
        if (interest > 0) {
            balance += interest;
            setMessage(`📈 Начислены проценты на остаток: +${interest} ₽`);
        }

        // Изменение курса доллара (случайное от -5% до +5%)
        const change = (Math.random() * 10 - 5) / 100; // -5% .. +5%
        usdRate = usdRate * (1 + change);
        if (usdRate < 10) usdRate = 10; // не ниже 10 рублей

        // Проверка завершённых депозитов
        checkCompletedDeposits();

        updateUI();
        saveToStorage();
    }

    // --- Циклическая проверка депозитов (каждую секунду) ---
    setInterval(() => {
        // Проверяем, не истекли ли депозиты, и обновляем отображение
        const now = Date.now();
        let changed = false;
        deposits = deposits.filter(d => {
            if (d.endTime <= now) {
                const percent = d.interest / 100;
                const payout = d.amount * (1 + percent);
                balance += payout;
                setMessage(`🏦 Депозит созрел: +${payout.toFixed(2)} ₽`, true);
                changed = true;
                return false; // удаляем
            }
            return true;
        });
        if (changed) {
            updateUI();
            saveToStorage();
        } else {
            // просто обновим таймеры
            renderDeposits();
        }
    }, 1000);

    // --- Инициализация ---
    loadFromStorage();
    updateUI();
    saveToStorage();

    // --- Обработчики событий ---
    depositBtn.addEventListener('click', handleDeposit);
    withdrawBtn.addEventListener('click', handleWithdraw);
    loanBtn.addEventListener('click', handleLoan);
    repayBtn.addEventListener('click', handleRepay);
    investBtn.addEventListener('click', handleInvest);
    buyUsdBtn.addEventListener('click', handleBuyUsd);
    sellUsdBtn.addEventListener('click', handleSellUsd);
    deposit30Btn.addEventListener('click', () => openDeposit(30, 5));
    deposit60Btn.addEventListener('click', () => openDeposit(60, 8));
    deposit120Btn.addEventListener('click', () => openDeposit(120, 12));
    nextDayBtn.addEventListener('click', handleNextDay);

    amountInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') e.preventDefault();
    });
})();