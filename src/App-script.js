// 使用 composable
const {
  formatNumber,
  calculateEqualPayment,
  calculateEqualPrincipal,
  calculateInterestOnly,
  calculateNewTerm,
  exportToCSV
} = useLoanCalculator()

// 计算结果相关数据
const calculationResults = ref([])
const partialPaymentVisible = ref(false)
const fullPaymentVisible = ref(false)
const currentPartialPaymentPeriod = ref(null)
const modalOriginalDate = ref('')
const modalRemainingPrincipal = ref(0)
const currentFullPaymentData = ref(null)

// 计算汇总数据
const summaryData = computed(() => {
  if (!calculationResults.value.length) return {}

  const totalPayment = calculationResults.value.reduce((sum, result) => sum + result.payment, 0)
  const totalInterest = calculationResults.value.reduce((sum, result) => sum + result.interest, 0)

  let displayRate = loanForm.interestRate
  if (loanForm.rateType === 'monthly') {
    displayRate = displayRate * 12
  }

  const paymentMethodNames = {
    'equal-payment': '等额本息',
    'equal-principal': '等额本金',
    'interest-only': '先息后本'
  }

  return {
    loanAmount: loanForm.loanAmount,
    interestRate: displayRate.toFixed(2),
    loanTerm: loanForm.loanTerm + '个月' + (loanSettled.value ? '（已结清）' : ''),
    paymentMethod: paymentMethodNames[loanForm.paymentMethod],
    totalInterest,
    totalPayment,
    firstPayment: calculationResults.value[0]?.payment || 0,
    lastPayment: calculationResults.value[calculationResults.value.length - 1]?.payment || 0
  }
})

const totalSummary = computed(() => {
  if (!calculationResults.value.length) return { totalPrincipal: 0, totalInterest: 0, totalPayment: 0 }

  return {
    totalPrincipal: calculationResults.value.reduce((sum, result) => sum + result.principal, 0),
    totalInterest: calculationResults.value.reduce((sum, result) => sum + result.interest, 0),
    totalPayment: calculationResults.value.reduce((sum, result) => sum + result.payment, 0)
  }
})

// 设置默认日期
const setDefaultDate = () => {
  const today = new Date()
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1)
  loanForm.startDate = nextMonth.toISOString().split('T')[0]
}

// 计算贷款
const calculate = async () => {
  if (!loanFormRef.value) return

  try {
    await loanFormRef.value.validate()

    calculating.value = true
    loanSettled.value = false

    const { loanAmount, interestRate, rateType, loanTerm, paymentMethod, startDate } = loanForm

    // 转换为月利率
    let monthlyRate
    if (rateType === 'annual') {
      monthlyRate = interestRate / 100 / 12
    } else {
      monthlyRate = interestRate / 100
    }

    let results = []
    const startDateObj = new Date(startDate)

    switch (paymentMethod) {
      case 'equal-payment':
        results = calculateEqualPayment(loanAmount, monthlyRate, loanTerm, startDateObj)
        break
      case 'equal-principal':
        results = calculateEqualPrincipal(loanAmount, monthlyRate, loanTerm, startDateObj)
        break
      case 'interest-only':
        results = calculateInterestOnly(loanAmount, monthlyRate, loanTerm, startDateObj)
        break
    }

    calculationResults.value = results
    calculating.value = false

    ElMessage.success('计算完成')
  } catch (error) {
    calculating.value = false
    console.log('表单验证失败:', error)
  }
}

// 重置表单
const reset = () => {
  if (loanFormRef.value) {
    loanFormRef.value.resetFields()
  }

  calculationResults.value = []
  loanSettled.value = false
  setDefaultDate()

  ElMessage.success('表单已重置')
}

// 导出CSV
const exportCSV = () => {
  exportToCSV(calculationResults.value, loanForm)
}

// 显示部分还款模态框
const showPartialPaymentModal = (period) => {
  currentPartialPaymentPeriod.value = period

  // 获取期初剩余本金（上一期的剩余本金）
  let remainingPrincipal
  if (period === 1) {
    remainingPrincipal = loanForm.loanAmount
  } else {
    const previousPeriodResult = calculationResults.value.find(result => result.period === period - 1)
    remainingPrincipal = previousPeriodResult ? previousPeriodResult.remainingPrincipal : 0
  }

  // 获取当前期的原定还款日期
  const currentPeriodResult = calculationResults.value.find(result => result.period === period)
  const originalDate = currentPeriodResult ? currentPeriodResult.paymentDate : ''

  // 更新模态框信息
  modalOriginalDate.value = originalDate
  modalRemainingPrincipal.value = remainingPrincipal

  // 显示模态框
  partialPaymentVisible.value = true
}

// 处理部分还款确认
const handlePartialPaymentConfirm = (data) => {
  const { period, partialAmount, partialPaymentDate, adjustmentType } = data

  // 验证部分还款金额
  let remainingPrincipal
  if (period === 1) {
    remainingPrincipal = loanForm.loanAmount
  } else {
    const previousPeriodResult = calculationResults.value.find(result => result.period === period - 1)
    remainingPrincipal = previousPeriodResult ? previousPeriodResult.remainingPrincipal : 0
  }

  if (partialAmount >= remainingPrincipal) {
    ElMessage.error('部分还款金额不能大于或等于剩余本金')
    return
  }

  // 执行部分还款计算
  processPartialPayment(period, partialAmount, partialPaymentDate, adjustmentType)
}

// 处理部分还款
const processPartialPayment = (period, partialAmount, partialPaymentDate, adjustmentType) => {
  // 1. 在当前期数行下方插入部分还款事件记录行
  insertPartialPaymentEvent(period, partialAmount, partialPaymentDate)

  // 2. 删除从 period + 1 开始的所有行
  removeRowsFromPeriod(period + 1)

  // 3. 计算新的还款计划
  const newPlan = calculateNewPartialPaymentPlan(period, partialAmount, adjustmentType)

  // 4. 将新计划追加到表格
  calculationResults.value = [...calculationResults.value.slice(0, period), ...newPlan]

  ElMessage.success('部分还款计算完成')
}

// 插入部分还款事件记录（在Vue中，我们不需要直接操作DOM，而是在数据中处理）
const insertPartialPaymentEvent = (period, partialAmount, partialPaymentDate) => {
  // 在Vue中，我们可以在表格中添加特殊的行来显示事件
  // 这里我们先用简单的消息提示
  const eventDate = new Date(partialPaymentDate).toLocaleDateString('zh-CN')
  ElMessage.info(`于 ${eventDate}，第${period}期进行部分还款：${formatNumber(partialAmount)} 元`)
}

// 从指定期数开始删除行
const removeRowsFromPeriod = (fromPeriod) => {
  calculationResults.value = calculationResults.value.filter(result => result.period < fromPeriod)
}

// 计算新的部分还款计划
const calculateNewPartialPaymentPlan = (period, partialAmount, adjustmentType) => {
  const { interestRate, rateType, loanTerm, paymentMethod, startDate } = loanForm

  // 转换为月利率
  let monthlyRate
  if (rateType === 'annual') {
    monthlyRate = interestRate / 100 / 12
  } else {
    monthlyRate = interestRate / 100
  }

  // 获取部分还款时的剩余本金
  let remainingPrincipal
  if (period === 1) {
    remainingPrincipal = loanForm.loanAmount
  } else {
    const previousResult = calculationResults.value.find(result => result.period === period - 1)
    remainingPrincipal = previousResult ? previousResult.remainingPrincipal : 0
  }

  // 计算部分还款后的新剩余本金
  const newRemainingPrincipal = remainingPrincipal - partialAmount
  const remainingTerms = loanTerm - period

  let newPlan = []
  const startDateObj = new Date(startDate)

  if (adjustmentType === 'shorten_term') {
    // 月供不变，缩短期限
    const originalMonthlyPayment = calculationResults.value.length > 0 ? calculationResults.value[0].payment : 0
    const newTerm = calculateNewTerm(newRemainingPrincipal, monthlyRate, originalMonthlyPayment)
    newPlan = calculateEqualPayment(newRemainingPrincipal, monthlyRate, newTerm, startDateObj, period)
  } else {
    // 期限不变，减少月供
    newPlan = calculateEqualPayment(newRemainingPrincipal, monthlyRate, remainingTerms, startDateObj, period)
  }

  return newPlan
}

// 显示全部还款模态框
const showFullPaymentModal = (period) => {
  const data = getFullPaymentData(period)
  currentFullPaymentData.value = data
  fullPaymentVisible.value = true
}

// 获取全部还款数据
const getFullPaymentData = (period) => {
  // 1. 获取本期开始时的"剩余本金" (即 period - 1 期结束时的值)
  let remainingPrincipal
  if (period === 1) {
    remainingPrincipal = loanForm.loanAmount
  } else {
    const previousPeriodResult = calculationResults.value.find(result => result.period === period - 1)
    remainingPrincipal = previousPeriodResult ? previousPeriodResult.remainingPrincipal : 0
  }

  // 2. 获取当前期 (period) 按原计划应还的"利息"
  const currentPeriodResult = calculationResults.value.find(result => result.period === period)
  const currentInterest = currentPeriodResult ? currentPeriodResult.interest : 0

  // 3. 计算全部还款总额
  const totalPayment = remainingPrincipal + currentInterest

  return {
    period: period,
    remainingPrincipal: remainingPrincipal,
    currentInterest: currentInterest,
    totalPayment: totalPayment
  }
}

// 处理全部还款确认
const handleFullPaymentConfirm = (data) => {
  // 1. 修改当前行的数据
  updateCurrentPeriodRow(data)

  // 2. 删除后续所有行
  removeRowsFromPeriod(data.period + 1)

  // 3. 显示贷款已结清状态
  loanSettled.value = true

  ElMessage.success('全部还款完成，贷款已结清！')
}

// 更新当前期数行
const updateCurrentPeriodRow = (data) => {
  const currentResult = calculationResults.value.find(result => result.period === data.period)
  if (currentResult) {
    currentResult.principal = data.remainingPrincipal
    currentResult.payment = data.totalPayment
    currentResult.remainingPrincipal = 0
  }
}

// 组件挂载时设置默认日期
onMounted(() => {
  setDefaultDate()
})