import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'

export function useLoanCalculator() {
  // 格式化数字
  const formatNumber = (num) => {
    return parseFloat(num).toLocaleString('zh-CN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  }

  // 等额本息计算
  const calculateEqualPayment = (principal, monthlyRate, term, startDate, periodOffset = 0) => {
    const results = []

    if (monthlyRate === 0) {
      // 无利息情况
      const monthlyPayment = principal / term
      let remainingPrincipal = principal

      for (let i = 1; i <= term; i++) {
        const paymentDate = new Date(startDate)
        paymentDate.setMonth(paymentDate.getMonth() + i + periodOffset - 1)

        const principalPayment = monthlyPayment
        const interestPayment = 0
        remainingPrincipal -= principalPayment

        results.push({
          period: i + periodOffset,
          paymentDate: paymentDate.toISOString().split('T')[0],
          principal: principalPayment,
          interest: interestPayment,
          payment: monthlyPayment,
          remainingPrincipal: Math.max(0, remainingPrincipal)
        })
      }
    } else {
      // 有利息情况
      const monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, term)) / (Math.pow(1 + monthlyRate, term) - 1)
      let remainingPrincipal = principal

      for (let i = 1; i <= term; i++) {
        const paymentDate = new Date(startDate)
        paymentDate.setMonth(paymentDate.getMonth() + i + periodOffset - 1)

        const interestPayment = remainingPrincipal * monthlyRate
        const principalPayment = monthlyPayment - interestPayment
        remainingPrincipal -= principalPayment

        results.push({
          period: i + periodOffset,
          paymentDate: paymentDate.toISOString().split('T')[0],
          principal: principalPayment,
          interest: interestPayment,
          payment: monthlyPayment,
          remainingPrincipal: Math.max(0, remainingPrincipal)
        })
      }
    }

    return results
  }

  // 等额本金计算
  const calculateEqualPrincipal = (principal, monthlyRate, term, startDate) => {
    const results = []
    const monthlyPrincipal = principal / term
    let remainingPrincipal = principal

    for (let i = 1; i <= term; i++) {
      const paymentDate = new Date(startDate)
      paymentDate.setMonth(paymentDate.getMonth() + i - 1)

      const interestPayment = remainingPrincipal * monthlyRate
      const principalPayment = monthlyPrincipal
      const totalPayment = principalPayment + interestPayment
      remainingPrincipal -= principalPayment

      results.push({
        period: i,
        paymentDate: paymentDate.toISOString().split('T')[0],
        principal: principalPayment,
        interest: interestPayment,
        payment: totalPayment,
        remainingPrincipal: Math.max(0, remainingPrincipal)
      })
    }

    return results
  }

  // 先息后本计算
  const calculateInterestOnly = (principal, monthlyRate, term, startDate) => {
    const results = []
    const monthlyInterest = principal * monthlyRate

    for (let i = 1; i <= term; i++) {
      const paymentDate = new Date(startDate)
      paymentDate.setMonth(paymentDate.getMonth() + i - 1)

      let principalPayment = 0
      let interestPayment = monthlyInterest
      let totalPayment = interestPayment
      let remainingPrincipal = principal

      // 最后一期还本金
      if (i === term) {
        principalPayment = principal
        totalPayment = principalPayment + interestPayment
        remainingPrincipal = 0
      }

      results.push({
        period: i,
        paymentDate: paymentDate.toISOString().split('T')[0],
        principal: principalPayment,
        interest: interestPayment,
        payment: totalPayment,
        remainingPrincipal: remainingPrincipal
      })
    }

    return results
  }

  // 计算新期限（用于部分还款）
  const calculateNewTerm = (remainingPrincipal, monthlyRate, monthlyPayment) => {
    if (monthlyRate === 0) {
      return Math.ceil(remainingPrincipal / monthlyPayment)
    }

    // 使用等额本息公式计算期数
    const term = Math.log(1 + (remainingPrincipal * monthlyRate) / monthlyPayment) / Math.log(1 + monthlyRate)
    return Math.ceil(term)
  }

  // 导出CSV
  const exportToCSV = (results, loanForm) => {
    if (results.length === 0) {
      ElMessage.warning('请先进行计算后再导出')
      return
    }

    const headers = ['期数', '还款日期', '应还本金 (元)', '应还利息 (元)', '当期总还款额 (元)', '剩余本金 (元)']

    // 计算总计数据
    const totalPrincipalSum = results.reduce((sum, result) => sum + result.principal, 0)
    const totalInterestSum = results.reduce((sum, result) => sum + result.interest, 0)
    const totalPaymentSum = results.reduce((sum, result) => sum + result.payment, 0)

    const csvContent = [
      headers.join(','),
      ...results.map(result => [
        result.period,
        result.paymentDate,
        result.principal.toFixed(2),
        result.interest.toFixed(2),
        result.payment.toFixed(2),
        result.remainingPrincipal.toFixed(2)
      ].join(',')),
      // 添加总计行
      ['总计', '', totalPrincipalSum.toFixed(2), totalInterestSum.toFixed(2), totalPaymentSum.toFixed(2), ''].join(',')
    ].join('\n')

    // 添加BOM以支持中文
    const BOM = '\uFEFF'
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })

    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `贷款计算结果_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return {
    formatNumber,
    calculateEqualPayment,
    calculateEqualPrincipal,
    calculateInterestOnly,
    calculateNewTerm,
    exportToCSV
  }
}