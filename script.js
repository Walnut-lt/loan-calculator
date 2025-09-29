class LoanCalculator {
    constructor() {
        this.initializeElements();
        this.bindEvents();
        this.setDefaultDate();
    }

    initializeElements() {
        this.form = document.getElementById('loanForm');
        this.loanAmountInput = document.getElementById('loanAmount');
        this.interestRateInput = document.getElementById('interestRate');
        this.rateTypeSelect = document.getElementById('rateType');
        this.loanTermInput = document.getElementById('loanTerm');
        this.paymentMethodSelect = document.getElementById('paymentMethod');
        this.startDateInput = document.getElementById('startDate');

        this.calculateBtn = document.getElementById('calculateBtn');
        this.resetBtn = document.getElementById('resetBtn');
        this.exportBtn = document.getElementById('exportBtn');

        // 栅格区域元素
        this.gridLoanAmount = document.getElementById('gridLoanAmount');
        this.gridInterestRate = document.getElementById('gridInterestRate');
        this.gridLoanTerm = document.getElementById('gridLoanTerm');
        this.gridPaymentMethod = document.getElementById('gridPaymentMethod');
        this.gridTotalInterest = document.getElementById('gridTotalInterest');
        this.gridTotalPayment = document.getElementById('gridTotalPayment');
        this.gridFirstPayment = document.getElementById('gridFirstPayment');
        this.gridLastPayment = document.getElementById('gridLastPayment');

        // 表格元素
        this.resultTableBody = document.getElementById('resultTableBody');
        this.totalPrincipal = document.getElementById('totalPrincipal');
        this.totalInterest = document.getElementById('totalInterest');
        this.totalPayment = document.getElementById('totalPayment');

        // 部分还款模态框元素
        this.modal = document.getElementById('partialPaymentModal');
        this.modalPeriod = document.getElementById('modalPeriod');
        this.modalOriginalDate = document.getElementById('modalOriginalDate');
        this.modalRemainingPrincipal = document.getElementById('modalRemainingPrincipal');
        this.partialAmountInput = document.getElementById('partialAmount');
        this.partialPaymentDateInput = document.getElementById('partialPaymentDate');
        this.confirmBtn = document.getElementById('confirmPartialPayment');
        this.cancelBtn = document.getElementById('cancelPartialPayment');
        this.modalClose = document.querySelector('.modal-close');

        // 全部还款模态框元素
        this.fullPaymentModal = document.getElementById('fullPaymentModal');
        this.fullPaymentPeriod = document.getElementById('fullPaymentPeriod');
        this.fullPaymentPrincipal = document.getElementById('fullPaymentPrincipal');
        this.fullPaymentInterest = document.getElementById('fullPaymentInterest');
        this.fullPaymentTotal = document.getElementById('fullPaymentTotal');
        this.confirmFullPaymentBtn = document.getElementById('confirmFullPayment');
        this.cancelFullPaymentBtn = document.getElementById('cancelFullPayment');
        this.fullPaymentModalClose = document.getElementById('fullPaymentModalClose');

        this.calculationResults = [];
        this.currentPartialPaymentPeriod = null;
        this.currentFullPaymentData = null;

        // 贷款结清状态元素
        this.loanSettledStatus = document.getElementById('loanSettledStatus');
    }

    bindEvents() {
        this.calculateBtn.addEventListener('click', () => this.calculate());
        this.resetBtn.addEventListener('click', () => this.reset());
        this.exportBtn.addEventListener('click', () => this.exportCSV());

        // 输入验证
        this.interestRateInput.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            if (value < 0) e.target.value = 0;
        });

        this.loanAmountInput.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            if (value < 0) e.target.value = 0;
        });

        this.loanTermInput.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            if (value < 1) e.target.value = 1;
        });

        // 表格事件委托
        this.resultTableBody.addEventListener('click', (e) => {
            if (e.target.classList.contains('action-btn')) {
                const period = parseInt(e.target.dataset.period);
                const action = e.target.dataset.action;

                if (action === 'partial') {
                    this.showPartialPaymentModal(period);
                } else if (action === 'full') {
                    this.fullPayment(period);
                }
            }
        });

        // 模态框事件
        this.modalClose.addEventListener('click', () => this.hideModal());
        this.cancelBtn.addEventListener('click', () => this.hideModal());
        this.confirmBtn.addEventListener('click', () => this.confirmPartialPayment());

        // 点击模态框外部关闭
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.hideModal();
            }
        });

        // ESC键关闭模态框
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.style.display === 'block') {
                this.hideModal();
            }
        });

        // 单选框样式更新
        document.addEventListener('change', (e) => {
            if (e.target.name === 'adjustmentType') {
                this.updateRadioButtonStyles();
            }
        });

        // 点击单选框容器选中对应的单选框
        document.addEventListener('click', (e) => {
            const radioOption = e.target.closest('.radio-option');
            if (radioOption) {
                const radioInput = radioOption.querySelector('input[type="radio"]');
                if (radioInput && !radioInput.checked) {
                    radioInput.checked = true;
                    this.updateRadioButtonStyles();
                }
            }
        });

        // 全部还款模态框事件
        this.fullPaymentModalClose.addEventListener('click', () => this.hideFullPaymentModal());
        this.cancelFullPaymentBtn.addEventListener('click', () => this.hideFullPaymentModal());
        this.confirmFullPaymentBtn.addEventListener('click', () => this.confirmFullPaymentAction());

        // 点击全部还款模态框外部关闭
        this.fullPaymentModal.addEventListener('click', (e) => {
            if (e.target === this.fullPaymentModal) {
                this.hideFullPaymentModal();
            }
        });
    }

    setDefaultDate() {
        const today = new Date();
        const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
        this.startDateInput.value = nextMonth.toISOString().split('T')[0];
    }

    calculate() {
        if (!this.validateForm()) {
            return;
        }

        const loanAmount = parseFloat(this.loanAmountInput.value);
        const interestRate = parseFloat(this.interestRateInput.value);
        const rateType = this.rateTypeSelect.value;
        const loanTerm = parseInt(this.loanTermInput.value);
        const paymentMethod = this.paymentMethodSelect.value;
        const startDate = new Date(this.startDateInput.value);

        // 转换为月利率
        let monthlyRate;
        if (rateType === 'annual') {
            monthlyRate = interestRate / 100 / 12;
        } else {
            monthlyRate = interestRate / 100;
        }

        let results = [];
        switch (paymentMethod) {
            case 'equal-payment':
                results = this.calculateEqualPayment(loanAmount, monthlyRate, loanTerm, startDate);
                break;
            case 'equal-principal':
                results = this.calculateEqualPrincipal(loanAmount, monthlyRate, loanTerm, startDate);
                break;
            case 'interest-only':
                results = this.calculateInterestOnly(loanAmount, monthlyRate, loanTerm, startDate);
                break;
        }

        this.calculationResults = results;
        this.displayResults(results, paymentMethod);
    }

    calculateEqualPayment(principal, monthlyRate, term, startDate, periodOffset = 0) {
        const results = [];

        if (monthlyRate === 0) {
            // 无利息情况
            const monthlyPayment = principal / term;
            let remainingPrincipal = principal;

            for (let i = 1; i <= term; i++) {
                const paymentDate = new Date(startDate);
                paymentDate.setMonth(paymentDate.getMonth() + i + periodOffset - 1);

                const principalPayment = monthlyPayment;
                const interestPayment = 0;
                remainingPrincipal -= principalPayment;

                results.push({
                    period: i + periodOffset,
                    paymentDate: paymentDate.toISOString().split('T')[0],
                    principal: principalPayment,
                    interest: interestPayment,
                    payment: monthlyPayment,
                    remainingPrincipal: Math.max(0, remainingPrincipal)
                });
            }
        } else {
            // 有利息情况
            const monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, term)) / (Math.pow(1 + monthlyRate, term) - 1);
            let remainingPrincipal = principal;

            for (let i = 1; i <= term; i++) {
                const paymentDate = new Date(startDate);
                paymentDate.setMonth(paymentDate.getMonth() + i + periodOffset - 1);

                const interestPayment = remainingPrincipal * monthlyRate;
                const principalPayment = monthlyPayment - interestPayment;
                remainingPrincipal -= principalPayment;

                results.push({
                    period: i + periodOffset,
                    paymentDate: paymentDate.toISOString().split('T')[0],
                    principal: principalPayment,
                    interest: interestPayment,
                    payment: monthlyPayment,
                    remainingPrincipal: Math.max(0, remainingPrincipal)
                });
            }
        }

        return results;
    }

    calculateEqualPrincipal(principal, monthlyRate, term, startDate) {
        const results = [];
        const monthlyPrincipal = principal / term;
        let remainingPrincipal = principal;

        for (let i = 1; i <= term; i++) {
            const paymentDate = new Date(startDate);
            paymentDate.setMonth(paymentDate.getMonth() + i - 1);

            const interestPayment = remainingPrincipal * monthlyRate;
            const principalPayment = monthlyPrincipal;
            const totalPayment = principalPayment + interestPayment;
            remainingPrincipal -= principalPayment;

            results.push({
                period: i,
                paymentDate: paymentDate.toISOString().split('T')[0],
                principal: principalPayment,
                interest: interestPayment,
                payment: totalPayment,
                remainingPrincipal: Math.max(0, remainingPrincipal)
            });
        }

        return results;
    }

    calculateInterestOnly(principal, monthlyRate, term, startDate) {
        const results = [];
        const monthlyInterest = principal * monthlyRate;

        for (let i = 1; i <= term; i++) {
            const paymentDate = new Date(startDate);
            paymentDate.setMonth(paymentDate.getMonth() + i - 1);

            let principalPayment = 0;
            let interestPayment = monthlyInterest;
            let totalPayment = interestPayment;
            let remainingPrincipal = principal;

            // 最后一期还本金
            if (i === term) {
                principalPayment = principal;
                totalPayment = principalPayment + interestPayment;
                remainingPrincipal = 0;
            }

            results.push({
                period: i,
                paymentDate: paymentDate.toISOString().split('T')[0],
                principal: principalPayment,
                interest: interestPayment,
                payment: totalPayment,
                remainingPrincipal: remainingPrincipal
            });
        }

        return results;
    }

    displayResults(results, paymentMethod) {
        this.displayGridSummary(results, paymentMethod);
        this.displayTable(results);
    }

    displayGridSummary(results, paymentMethod) {
        const totalPayment = results.reduce((sum, result) => sum + result.payment, 0);
        const totalInterest = results.reduce((sum, result) => sum + result.interest, 0);
        const principal = parseFloat(this.loanAmountInput.value);

        const paymentMethodNames = {
            'equal-payment': '等额本息',
            'equal-principal': '等额本金',
            'interest-only': '先息后本'
        };

        // 计算年利率（统一显示为年利率）
        let displayRate = parseFloat(this.interestRateInput.value);
        if (this.rateTypeSelect.value === 'monthly') {
            displayRate = displayRate * 12;
        }

        // 更新栅格区域数据
        this.gridLoanAmount.textContent = this.formatNumber(principal);
        this.gridInterestRate.textContent = displayRate.toFixed(2) + '%';
        this.gridLoanTerm.textContent = this.loanTermInput.value + '个月';
        this.gridPaymentMethod.textContent = paymentMethodNames[paymentMethod];
        this.gridTotalInterest.textContent = this.formatNumber(totalInterest);
        this.gridTotalPayment.textContent = this.formatNumber(totalPayment);
        this.gridFirstPayment.textContent = this.formatNumber(results[0].payment);
        this.gridLastPayment.textContent = this.formatNumber(results[results.length - 1].payment);
    }

    displayTable(results) {
        this.resultTableBody.innerHTML = '';

        // 计算总计数据
        const totalPrincipalSum = results.reduce((sum, result) => sum + result.principal, 0);
        const totalInterestSum = results.reduce((sum, result) => sum + result.interest, 0);
        const totalPaymentSum = results.reduce((sum, result) => sum + result.payment, 0);

        // 显示每期数据
        results.forEach((result, index) => {
            const row = document.createElement('tr');

            // 为期数添加首期和末期标识，使用换行保持数字对齐
            let periodText = result.period;
            if (result.period === 1) {
                periodText = `${result.period}<br><span style="color: #28a745; font-weight: bold; font-size: 12px;">(首期)</span>`;
            } else if (result.period === results.length) {
                periodText = `${result.period}<br><span style="color: #dc3545; font-weight: bold; font-size: 12px;">(末期)</span>`;
            }

            row.innerHTML = `
                <td>${periodText}</td>
                <td>${result.paymentDate}</td>
                <td>${this.formatNumber(result.principal)}</td>
                <td>${this.formatNumber(result.interest)}</td>
                <td>${this.formatNumber(result.payment)}</td>
                <td>${this.formatNumber(result.remainingPrincipal)}</td>
                <td>
                    <button class="action-btn action-btn-partial" data-period="${result.period}" data-action="partial">部分还款</button>
                    <button class="action-btn action-btn-full" data-period="${result.period}" data-action="full">全部还款</button>
                </td>
            `;
            this.resultTableBody.appendChild(row);
        });

        // 更新总计行
        this.totalPrincipal.textContent = this.formatNumber(totalPrincipalSum);
        this.totalInterest.textContent = this.formatNumber(totalInterestSum);
        this.totalPayment.textContent = this.formatNumber(totalPaymentSum);
    }

    validateForm() {
        const loanAmount = parseFloat(this.loanAmountInput.value);
        const interestRate = parseFloat(this.interestRateInput.value);
        const loanTerm = parseInt(this.loanTermInput.value);
        const startDate = this.startDateInput.value;

        if (!loanAmount || loanAmount <= 0) {
            alert('请输入有效的贷款金额');
            this.loanAmountInput.focus();
            return false;
        }

        if (interestRate < 0) {
            alert('利率不能为负数');
            this.interestRateInput.focus();
            return false;
        }

        if (!loanTerm || loanTerm <= 0) {
            alert('请输入有效的贷款期限');
            this.loanTermInput.focus();
            return false;
        }

        if (!startDate) {
            alert('请选择还款起始日期');
            this.startDateInput.focus();
            return false;
        }

        return true;
    }

    reset() {
        this.form.reset();
        this.setDefaultDate();

        // 重置栅格区域
        this.gridLoanAmount.textContent = '-';
        this.gridInterestRate.textContent = '-';
        this.gridLoanTerm.textContent = '-';
        this.gridPaymentMethod.textContent = '-';
        this.gridTotalInterest.textContent = '-';
        this.gridTotalPayment.textContent = '-';
        this.gridFirstPayment.textContent = '-';
        this.gridLastPayment.textContent = '-';

        // 重置表格
        this.resultTableBody.innerHTML = '';
        this.totalPrincipal.textContent = '-';
        this.totalInterest.textContent = '-';
        this.totalPayment.textContent = '-';

        this.calculationResults = [];
    }

    exportCSV() {
        if (this.calculationResults.length === 0) {
            alert('请先进行计算后再导出');
            return;
        }

        const headers = ['期数', '还款日期', '应还本金 (元)', '应还利息 (元)', '当期总还款额 (元)', '剩余本金 (元)'];

        // 计算总计数据
        const totalPrincipalSum = this.calculationResults.reduce((sum, result) => sum + result.principal, 0);
        const totalInterestSum = this.calculationResults.reduce((sum, result) => sum + result.interest, 0);
        const totalPaymentSum = this.calculationResults.reduce((sum, result) => sum + result.payment, 0);

        const csvContent = [
            headers.join(','),
            ...this.calculationResults.map(result => [
                result.period,
                result.paymentDate,
                result.principal.toFixed(2),
                result.interest.toFixed(2),
                result.payment.toFixed(2),
                result.remainingPrincipal.toFixed(2)
            ].join(',')),
            // 添加总计行
            ['总计', '', totalPrincipalSum.toFixed(2), totalInterestSum.toFixed(2), totalPaymentSum.toFixed(2), ''].join(',')
        ].join('\n');

        // 添加BOM以支持中文
        const BOM = '\uFEFF';
        const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });

        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `贷款计算结果_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    formatNumber(num) {
        return parseFloat(num).toLocaleString('zh-CN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    showPartialPaymentModal(period) {
        this.currentPartialPaymentPeriod = period;

        // 获取期初剩余本金（上一期的剩余本金）
        let remainingPrincipal;
        if (period === 1) {
            remainingPrincipal = parseFloat(this.loanAmountInput.value);
        } else {
            const previousPeriodResult = this.calculationResults.find(result => result.period === period - 1);
            remainingPrincipal = previousPeriodResult ? previousPeriodResult.remainingPrincipal : 0;
        }

        // 获取当前期的原定还款日期
        const currentPeriodResult = this.calculationResults.find(result => result.period === period);
        const originalDate = currentPeriodResult ? currentPeriodResult.paymentDate : '';

        // 更新模态框信息
        this.modalPeriod.textContent = period;
        this.modalOriginalDate.textContent = originalDate;
        this.modalRemainingPrincipal.textContent = this.formatNumber(remainingPrincipal);

        // 设置提前还款时间的最小值和默认值
        this.setPartialPaymentDateConstraints(period, originalDate);

        // 重置输入框
        this.partialAmountInput.value = '';
        document.querySelector('input[name="adjustmentType"][value="shorten_term"]').checked = true;

        // 更新单选框样式
        this.updateRadioButtonStyles();

        // 显示模态框
        this.modal.style.display = 'block';
    }

    setPartialPaymentDateConstraints(period, originalDate) {
        const originalDateObj = new Date(originalDate);

        // 设置最小日期为今天
        const minDate = originalDateObj.toISOString().split('T')[0];
        this.partialPaymentDateInput.min = minDate;

        // 设置最大日期为原定还款日期 + 1月
        const maxDateObj = new Date(originalDateObj);
        maxDateObj.setFullYear(maxDateObj.getMonth() + 1);
        const maxDate = maxDateObj.toISOString().split('T')[0];
        this.partialPaymentDateInput.max = maxDate;

        // 设置默认日期为今天
        this.partialPaymentDateInput.value = minDate;
    }

    hideModal() {
        this.modal.style.display = 'none';
        this.currentPartialPaymentPeriod = null;
    }

    confirmPartialPayment() {
        const period = this.currentPartialPaymentPeriod;
        const partialAmount = parseFloat(this.partialAmountInput.value);
        const partialPaymentDate = this.partialPaymentDateInput.value;
        const adjustmentType = document.querySelector('input[name="adjustmentType"]:checked').value;

        // 验证输入
        if (!partialAmount || partialAmount <= 0) {
            alert('请输入有效的还款金额');
            return;
        }

        if (!partialPaymentDate) {
            alert('请选择提前还款时间');
            return;
        }

        // 验证时间范围
        const selectedDate = new Date(partialPaymentDate);
        const today = new Date();

        if (selectedDate < today) {
            alert('提前还款时间不能早于今天');
            return;
        }

        // 获取期初剩余本金
        let remainingPrincipal;
        if (period === 1) {
            remainingPrincipal = parseFloat(this.loanAmountInput.value);
        } else {
            const previousPeriodResult = this.calculationResults.find(result => result.period === period - 1);
            remainingPrincipal = previousPeriodResult ? previousPeriodResult.remainingPrincipal : 0;
        }

        if (partialAmount >= remainingPrincipal) {
            alert('部分还款金额不能大于或等于剩余本金');
            return;
        }

        // 执行部分还款计算
        this.processPartialPayment(period, partialAmount, partialPaymentDate, adjustmentType);
    }

    processPartialPayment(period, partialAmount, partialPaymentDate, adjustmentType) {
        // 1. 关闭模态框
        this.hideModal();

        // 2. 在当前期数行下方插入部分还款事件记录行
        this.insertPartialPaymentEventRow(period, partialAmount, partialPaymentDate);

        // 3. 删除从 period + 1 开始的所有行
        this.removeRowsFromPeriod(period + 1);

        // 4. 计算新的还款计划
        const newPlan = this.calculateNewPartialPaymentPlan(period, partialAmount, adjustmentType);

        // 5. 将新计划追加到表格
        this.appendNewPlanRows(newPlan);

        // 6. 更新计算结果数组
        this.updateCalculationResults(period, partialAmount, newPlan);

        // 7. 更新页面顶部的总览信息
        this.updateGridSummaryAfterPartialPayment();
    }

    insertPartialPaymentEventRow(period, partialAmount, partialPaymentDate) {
        // 找到当前期数的行
        const rows = this.resultTableBody.querySelectorAll('tr');
        let targetRow = null;

        for (let row of rows) {
            const firstCell = row.cells[0];
            if (firstCell && firstCell.textContent.includes(period.toString())) {
                targetRow = row;
                break;
            }
        }

        if (targetRow) {
            // 创建事件记录行
            const eventRow = document.createElement('tr');
            eventRow.className = 'partial-payment-event';

            const eventDateObj = new Date(partialPaymentDate);
            const eventDate = eventDateObj.toLocaleDateString('zh-CN');

            eventRow.innerHTML = `
                <td colspan="7">
                    <div class="event-text">
                        于 ${eventDate}，部分还款：${this.formatNumber(partialAmount)} 元
                    </div>
                </td>
            `;

            // 在目标行后插入事件行
            targetRow.parentNode.insertBefore(eventRow, targetRow.nextSibling);
        }
    }

    removeRowsFromPeriod(fromPeriod) {
        const rows = Array.from(this.resultTableBody.querySelectorAll('tr'));

        for (let row of rows) {
            // 跳过事件记录行
            if (row.classList.contains('partial-payment-event')) {
                continue;
            }

            const firstCell = row.cells[0];
            if (firstCell) {
                // 提取期数（处理包含首期/末期标识的情况）
                const periodMatch = firstCell.textContent.match(/^\d+/);
                if (periodMatch) {
                    const rowPeriod = parseInt(periodMatch[0]);
                    if (rowPeriod >= fromPeriod) {
                        row.remove();
                    }
                }
            }
        }
    }

    calculateNewPartialPaymentPlan(period, partialAmount, adjustmentType) {
        // 获取原始贷款参数
        const interestRate = parseFloat(this.interestRateInput.value);
        const rateType = this.rateTypeSelect.value;
        const originalTerm = parseInt(this.loanTermInput.value);
        const paymentMethod = this.paymentMethodSelect.value;
        const startDate = new Date(this.startDateInput.value);

        // 转换为月利率
        let monthlyRate;
        if (rateType === 'annual') {
            monthlyRate = interestRate / 100 / 12;
        } else {
            monthlyRate = interestRate / 100;
        }

        // 获取部分还款时的剩余本金
        let remainingPrincipal;
        if (period === 1) {
            remainingPrincipal = parseFloat(this.loanAmountInput.value);
        } else {
            const previousResult = this.calculationResults.find(result => result.period === period - 1);
            remainingPrincipal = previousResult ? previousResult.remainingPrincipal : 0;
        }

        // 计算部分还款后的新剩余本金
        const newRemainingPrincipal = remainingPrincipal - partialAmount;
        const remainingTerms = originalTerm - period;

        let newPlan = [];

        if (adjustmentType === 'shorten_term') {
            // 月供不变，缩短期限
            const originalMonthlyPayment = this.calculationResults.length > 0 ? this.calculationResults[0].payment : 0;
            const newTerm = this.calculateNewTerm(newRemainingPrincipal, monthlyRate, originalMonthlyPayment);
            newPlan = this.calculateEqualPayment(newRemainingPrincipal, monthlyRate, newTerm, startDate, period);
        } else {
            // 期限不变，减少月供
            newPlan = this.calculateEqualPayment(newRemainingPrincipal, monthlyRate, remainingTerms, startDate, period);
        }

        return newPlan;
    }

    appendNewPlanRows(newPlan) {
        newPlan.forEach((result, index) => {
            const row = document.createElement('tr');

            // 为期数添加首期和末期标识
            let periodText = result.period;
            if (result.period === 1) {
                periodText = `${result.period}<br><span style="color: #28a745; font-weight: bold; font-size: 12px;">(首期)</span>`;
            } else if (index === newPlan.length - 1) {
                periodText = `${result.period}<br><span style="color: #dc3545; font-weight: bold; font-size: 12px;">(末期)</span>`;
            }

            row.innerHTML = `
                <td>${periodText}</td>
                <td>${result.paymentDate}</td>
                <td>${this.formatNumber(result.principal)}</td>
                <td>${this.formatNumber(result.interest)}</td>
                <td>${this.formatNumber(result.payment)}</td>
                <td>${this.formatNumber(result.remainingPrincipal)}</td>
                <td>
                    <button class="action-btn action-btn-partial" data-period="${result.period}" data-action="partial">部分还款</button>
                    <button class="action-btn action-btn-full" data-period="${result.period}" data-action="full">全部还款</button>
                </td>
            `;
            this.resultTableBody.appendChild(row);
        });
    }

    updateCalculationResults(period, partialAmount, newPlan) {
        // 保留部分还款期之前的记录
        const beforePartialPayment = this.calculationResults.slice(0, period);

        // 合并新计划
        this.calculationResults = beforePartialPayment.concat(newPlan);
    }

    updateGridSummaryAfterPartialPayment() {
        const paymentMethod = this.paymentMethodSelect.value;
        const results = this.calculationResults;

        if (results.length === 0) return;

        // 重新计算汇总数据
        const totalPayment = results.reduce((sum, result) => sum + result.payment, 0);
        const totalInterest = results.reduce((sum, result) => sum + result.interest, 0);

        const paymentMethodNames = {
            'equal-payment': '等额本息',
            'equal-principal': '等额本金',
            'interest-only': '先息后本'
        };

        // 计算年利率（统一显示为年利率）
        let displayRate = parseFloat(this.interestRateInput.value);
        if (this.rateTypeSelect.value === 'monthly') {
            displayRate = displayRate * 12;
        }

        // 更新栅格区域数据
        this.gridLoanAmount.textContent = this.formatNumber(parseFloat(this.loanAmountInput.value));
        this.gridInterestRate.textContent = displayRate.toFixed(2) + '%';
        this.gridLoanTerm.textContent = this.loanTermInput.value + '个月';
        this.gridPaymentMethod.textContent = paymentMethodNames[paymentMethod];
        this.gridTotalInterest.textContent = this.formatNumber(totalInterest);
        this.gridTotalPayment.textContent = this.formatNumber(totalPayment);
        this.gridFirstPayment.textContent = this.formatNumber(results[0].payment);
        this.gridLastPayment.textContent = this.formatNumber(results[results.length - 1].payment);

        // 更新总计行
        const totalPrincipalSum = results.reduce((sum, result) => sum + result.principal, 0);
        const totalInterestSum = results.reduce((sum, result) => sum + result.interest, 0);
        const totalPaymentSum = results.reduce((sum, result) => sum + result.payment, 0);

        this.totalPrincipal.textContent = this.formatNumber(totalPrincipalSum);
        this.totalInterest.textContent = this.formatNumber(totalInterestSum);
        this.totalPayment.textContent = this.formatNumber(totalPaymentSum);
    }

    updateRadioButtonStyles() {
        const radioOptions = document.querySelectorAll('.radio-option');
        radioOptions.forEach(option => {
            const radio = option.querySelector('input[type="radio"]');
            if (radio && radio.checked) {
                option.classList.add('selected');
            } else {
                option.classList.remove('selected');
            }
        });
    }

    calculateNewTerm(remainingPrincipal, monthlyRate, monthlyPayment) {
        if (monthlyRate === 0) {
            return Math.ceil(remainingPrincipal / monthlyPayment);
        }

        // 使用等额本息公式计算期数
        const term = Math.log(1 + (remainingPrincipal * monthlyRate) / monthlyPayment) / Math.log(1 + monthlyRate);
        return Math.ceil(term);
    }

    fullPayment(period) {
        // 获取数据并显示模态框
        this.showFullPaymentModal(period);
    }

    showFullPaymentModal(period) {
        // 获取全部还款数据
        const data = this.getFullPaymentData(period);

        // 更新模态框内容
        this.fullPaymentPeriod.textContent = period;
        this.fullPaymentPrincipal.textContent = this.formatNumber(data.remainingPrincipal) + ' 元';
        this.fullPaymentInterest.textContent = this.formatNumber(data.currentInterest) + ' 元';
        this.fullPaymentTotal.textContent = this.formatNumber(data.totalPayment) + ' 元';

        // 存储当前数据供确认时使用
        this.currentFullPaymentData = data;

        // 显示模态框
        this.fullPaymentModal.style.display = 'block';
    }

    hideFullPaymentModal() {
        this.fullPaymentModal.style.display = 'none';
        this.currentFullPaymentData = null;
    }

    confirmFullPaymentAction() {
        if (this.currentFullPaymentData) {
            const data = this.currentFullPaymentData;

            // 1. 关闭模态框
            this.hideFullPaymentModal();

            // 2. 修改当前行的数据
            this.updateCurrentPeriodRow(data);

            // 3. 删除后续所有行
            this.removeRowsFromPeriod(data.period + 1);

            // 4. 禁用所有剩余的按钮
            this.disableAllActionButtons();

            // 5. 显示贷款已结清状态
            this.showLoanSettledStatus();

            // 6. 更新计算结果数组
            this.updateCalculationResultsAfterFullPayment(data);

            // 7. 更新页面顶部的总览信息
            this.updateGridSummaryAfterFullPayment();
        }
    }

    updateCurrentPeriodRow(data) {
        // 找到当前期数的行
        const rows = this.resultTableBody.querySelectorAll('tr:not(.partial-payment-event)');

        for (let row of rows) {
            const firstCell = row.cells[0];
            if (firstCell) {
                const periodMatch = firstCell.textContent.match(/^\d+/);
                if (periodMatch && parseInt(periodMatch[0]) === data.period) {
                    // 更新应还本金
                    row.cells[2].textContent = this.formatNumber(data.remainingPrincipal);
                    // 保持应还利息不变（已经是正确的）
                    // 更新当期总还款额
                    row.cells[4].textContent = this.formatNumber(data.totalPayment);
                    // 更新剩余本金为0
                    row.cells[5].textContent = '0.00';

                    // 为该行添加特殊样式表示已结清
                    row.classList.add('settled-row');
                    break;
                }
            }
        }
    }

    disableAllActionButtons() {
        const actionButtons = document.querySelectorAll('.action-btn');
        actionButtons.forEach(button => {
            button.disabled = true;
        });
    }

    showLoanSettledStatus() {
        this.loanSettledStatus.classList.remove('hidden');
    }

    updateCalculationResultsAfterFullPayment(data) {
        // 找到当前期数的结果并更新
        const currentResult = this.calculationResults.find(result => result.period === data.period);
        if (currentResult) {
            currentResult.principal = data.remainingPrincipal;
            currentResult.payment = data.totalPayment;
            currentResult.remainingPrincipal = 0;
        }

        // 移除后续期数的结果
        this.calculationResults = this.calculationResults.filter(result => result.period <= data.period);
    }

    updateGridSummaryAfterFullPayment() {
        const results = this.calculationResults;
        if (results.length === 0) return;

        const paymentMethod = this.paymentMethodSelect.value;
        const paymentMethodNames = {
            'equal-payment': '等额本息',
            'equal-principal': '等额本金',
            'interest-only': '先息后本'
        };

        // 重新计算汇总数据
        const totalPayment = results.reduce((sum, result) => sum + result.payment, 0);
        const totalInterest = results.reduce((sum, result) => sum + result.interest, 0);

        // 计算年利率（统一显示为年利率）
        let displayRate = parseFloat(this.interestRateInput.value);
        if (this.rateTypeSelect.value === 'monthly') {
            displayRate = displayRate * 12;
        }

        // 更新栅格区域数据
        this.gridLoanAmount.textContent = this.formatNumber(parseFloat(this.loanAmountInput.value));
        this.gridInterestRate.textContent = displayRate.toFixed(2) + '%';
        this.gridLoanTerm.textContent = results.length + '个月（已结清）';
        this.gridPaymentMethod.textContent = paymentMethodNames[paymentMethod];
        this.gridTotalInterest.textContent = this.formatNumber(totalInterest);
        this.gridTotalPayment.textContent = this.formatNumber(totalPayment);
        this.gridFirstPayment.textContent = this.formatNumber(results[0].payment);
        this.gridLastPayment.textContent = this.formatNumber(results[results.length - 1].payment);

        // 更新总计行
        const totalPrincipalSum = results.reduce((sum, result) => sum + result.principal, 0);
        const totalInterestSum = results.reduce((sum, result) => sum + result.interest, 0);
        const totalPaymentSum = results.reduce((sum, result) => sum + result.payment, 0);

        this.totalPrincipal.textContent = this.formatNumber(totalPrincipalSum);
        this.totalInterest.textContent = this.formatNumber(totalInterestSum);
        this.totalPayment.textContent = this.formatNumber(totalPaymentSum);
    }

    getFullPaymentData(period) {
        // 1. 获取本期开始时的"剩余本金" (即 period - 1 期结束时的值)
        let remainingPrincipal;
        if (period === 1) {
            remainingPrincipal = parseFloat(this.loanAmountInput.value);
        } else {
            const previousPeriodResult = this.calculationResults.find(result => result.period === period - 1);
            remainingPrincipal = previousPeriodResult ? previousPeriodResult.remainingPrincipal : 0;
        }

        // 2. 获取当前期 (period) 按原计划应还的"利息"
        const currentPeriodResult = this.calculationResults.find(result => result.period === period);
        const currentInterest = currentPeriodResult ? currentPeriodResult.interest : 0;

        // 3. 计算全部还款总额
        const totalPayment = remainingPrincipal + currentInterest;

        return {
            period: period,
            remainingPrincipal: remainingPrincipal,
            currentInterest: currentInterest,
            totalPayment: totalPayment
        };
    }
}

// 页面加载完成后初始化计算器
let loanCalculator;
document.addEventListener('DOMContentLoaded', () => {
    loanCalculator = new LoanCalculator();
});