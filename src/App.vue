<template>
  <div id="app">
    <!-- 贷款结清状态 -->
    <el-alert
      v-if="loanSettled"
      title="贷款已结清"
      type="success"
      :closable="false"
      show-icon
    >
      <template #default>
        <p>恭喜您已成功结清所有贷款！</p>
      </template>
    </el-alert>

    <el-container>
      <el-main>
        <!-- 贷款计算器表单 -->
        <el-card class="loan-form-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <h2>贷款计算器</h2>
            </div>
          </template>

          <el-form
            ref="loanFormRef"
            :model="loanForm"
            :rules="formRules"
            label-width="140px"
            class="loan-form"
          >
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="贷款金额 (元)" prop="loanAmount">
                  <el-input-number
                    v-model="loanForm.loanAmount"
                    :min="1"
                    :step="1000"
                    :precision="0"
                    controls-position="right"
                    style="width: 100%"
                    placeholder="请输入贷款金额"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="贷款利率" prop="interestRate">
                  <el-input-number
                    v-model="loanForm.interestRate"
                    :min="0"
                    :step="0.1"
                    :precision="2"
                    controls-position="right"
                    style="width: 70%"
                    placeholder="请输入利率"
                  />
                  <el-select
                    v-model="loanForm.rateType"
                    style="width: 30%; margin-left: 8px"
                  >
                    <el-option label="%" value="annual" />
                    <el-option label="‰" value="monthly" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="贷款期限 (月)" prop="loanTerm">
                  <el-input-number
                    v-model="loanForm.loanTerm"
                    :min="1"
                    :step="1"
                    :precision="0"
                    controls-position="right"
                    style="width: 100%"
                    placeholder="请输入贷款期限"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="还款方式" prop="paymentMethod">
                  <el-select
                    v-model="loanForm.paymentMethod"
                    style="width: 100%"
                    placeholder="请选择还款方式"
                  >
                    <el-option label="等额本息" value="equal-payment" />
                    <el-option label="等额本金" value="equal-principal" />
                    <el-option label="先息后本" value="interest-only" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="还款起始日期" prop="startDate">
                  <el-date-picker
                    v-model="loanForm.startDate"
                    type="date"
                    placeholder="请选择还款起始日期"
                    style="width: 100%"
                    format="YYYY-MM-DD"
                    value-format="YYYY-MM-DD"
                    :clearable="true"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item>
                  <el-button type="primary" @click="calculate" :loading="calculating">
                    计算
                  </el-button>
                  <el-button @click="reset">重置</el-button>
                  <el-button
                    type="success"
                    @click="exportCSV"
                    :disabled="!calculationResults.length"
                  >
                    导出CSV
                  </el-button>
                </el-form-item>
              </el-col>
            </el-row>
          </el-form>
        </el-card>

        <!-- 计算结果概览 -->
        <el-card v-if="calculationResults.length" class="summary-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <h3>贷款概览</h3>
            </div>
          </template>

          <el-row :gutter="20" class="summary-grid">
            <el-col :span="6">
              <div class="summary-item">
                <div class="summary-label">贷款金额</div>
                <div class="summary-value">{{ formatNumber(summaryData.loanAmount) }} 元</div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="summary-item">
                <div class="summary-label">贷款利率</div>
                <div class="summary-value">{{ summaryData.interestRate }}%</div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="summary-item">
                <div class="summary-label">贷款期限</div>
                <div class="summary-value">{{ summaryData.loanTerm }}</div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="summary-item">
                <div class="summary-label">还款方式</div>
                <div class="summary-value">{{ summaryData.paymentMethod }}</div>
              </div>
            </el-col>
          </el-row>

          <el-row :gutter="20" class="summary-grid">
            <el-col :span="6">
              <div class="summary-item">
                <div class="summary-label">总利息</div>
                <div class="summary-value">{{ formatNumber(summaryData.totalInterest) }} 元</div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="summary-item">
                <div class="summary-label">总还款额</div>
                <div class="summary-value">{{ formatNumber(summaryData.totalPayment) }} 元</div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="summary-item">
                <div class="summary-label">首期还款</div>
                <div class="summary-value">{{ formatNumber(summaryData.firstPayment) }} 元</div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="summary-item">
                <div class="summary-label">末期还款</div>
                <div class="summary-value">{{ formatNumber(summaryData.lastPayment) }} 元</div>
              </div>
            </el-col>
          </el-row>
        </el-card>

        <!-- 还款计划表 -->
        <el-card v-if="calculationResults.length" class="table-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <h3>还款计划明细</h3>
            </div>
          </template>

          <el-table
            :data="calculationResults"
            stripe
            border
            style="width: 100%"
            :default-sort="{ prop: 'period', order: 'ascending' }"
          >
            <el-table-column prop="period" label="期数" width="80" align="center">
              <template #default="{ row, $index }">
                <div>
                  {{ row.period }}
                  <br>
                  <el-tag v-if="row.period === 1" size="small" type="success">首期</el-tag>
                  <el-tag v-else-if="$index === calculationResults.length - 1" size="small" type="danger">末期</el-tag>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="paymentDate" label="还款日期" width="120" align="center" />
            <el-table-column prop="principal" label="应还本金 (元)" width="140" align="right">
              <template #default="{ row }">
                {{ formatNumber(row.principal) }}
              </template>
            </el-table-column>
            <el-table-column prop="interest" label="应还利息 (元)" width="140" align="right">
              <template #default="{ row }">
                {{ formatNumber(row.interest) }}
              </template>
            </el-table-column>
            <el-table-column prop="payment" label="当期总还款额 (元)" width="160" align="right">
              <template #default="{ row }">
                {{ formatNumber(row.payment) }}
              </template>
            </el-table-column>
            <el-table-column prop="remainingPrincipal" label="剩余本金 (元)" width="140" align="right">
              <template #default="{ row }">
                {{ formatNumber(row.remainingPrincipal) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="200" align="center">
              <template #default="{ row }">
                <el-button
                  type="warning"
                  size="small"
                  @click="showPartialPaymentModal(row.period)"
                  :disabled="loanSettled"
                >
                  部分还款
                </el-button>
                <el-button
                  type="danger"
                  size="small"
                  @click="showFullPaymentModal(row.period)"
                  :disabled="loanSettled"
                >
                  全部还款
                </el-button>
              </template>
            </el-table-column>
          </el-table>

          <!-- 总计行 -->
          <div class="table-summary">
            <el-row :gutter="20">
              <el-col :span="8">
                <div class="summary-total">
                  <span class="total-label">总本金:</span>
                  <span class="total-value">{{ formatNumber(totalSummary.totalPrincipal) }} 元</span>
                </div>
              </el-col>
              <el-col :span="8">
                <div class="summary-total">
                  <span class="total-label">总利息:</span>
                  <span class="total-value">{{ formatNumber(totalSummary.totalInterest) }} 元</span>
                </div>
              </el-col>
              <el-col :span="8">
                <div class="summary-total">
                  <span class="total-label">总还款:</span>
                  <span class="total-value">{{ formatNumber(totalSummary.totalPayment) }} 元</span>
                </div>
              </el-col>
            </el-row>
          </div>
        </el-card>
      </el-main>
    </el-container>

    <!-- 部分还款模态框 -->
    <PartialPaymentModal
      v-model:visible="partialPaymentVisible"
      :current-period="currentPartialPaymentPeriod"
      :original-date="modalOriginalDate"
      :remaining-principal="modalRemainingPrincipal"
      :format-number="formatNumber"
      :loan-params="loanParams"
      @confirm="handlePartialPaymentConfirm"
    />

    <!-- 全部还款确认模态框 -->
    <FullPaymentModal
      v-model:visible="fullPaymentVisible"
      :payment-data="currentFullPaymentData"
      :format-number="formatNumber"
      @confirm="handleFullPaymentConfirm"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { WarningFilled } from '@element-plus/icons-vue'
import PartialPaymentModal from './components/PartialPaymentModal.vue'
import FullPaymentModal from './components/FullPaymentModal.vue'
import { useLoanCalculator } from './composables/useLoanCalculator.js'

// 使用 composable
const {
  formatNumber,
  calculateEqualPayment,
  calculateEqualPrincipal,
  calculateInterestOnly,
  calculateNewTerm,
  exportToCSV
} = useLoanCalculator()

// 响应式数据
const loanFormRef = ref()
const calculating = ref(false)
const loanSettled = ref(false)

// 表单数据
const loanForm = reactive({
  loanAmount: null,
  interestRate: null,
  rateType: 'annual',
  loanTerm: null,
  paymentMethod: 'equal-payment',
  startDate: ''
})

// 表单验证规则
const formRules = {
  loanAmount: [
    { required: true, message: '请输入贷款金额', trigger: 'blur' },
    { type: 'number', min: 1, message: '贷款金额必须大于0', trigger: 'blur' }
  ],
  interestRate: [
    { required: true, message: '请输入贷款利率', trigger: 'blur' },
    { type: 'number', min: 0, message: '利率不能为负数', trigger: 'blur' }
  ],
  loanTerm: [
    { required: true, message: '请输入贷款期限', trigger: 'blur' },
    { type: 'number', min: 1, message: '贷款期限必须大于0', trigger: 'blur' }
  ],
  paymentMethod: [
    { required: true, message: '请选择还款方式', trigger: 'change' }
  ],
  startDate: [
    { required: true, message: '请选择还款起始日期', trigger: 'change' }
  ]
}

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

// 贷款参数（供模拟计算使用）
const loanParams = computed(() => {
  if (!calculationResults.value.length) {
    return {
      interestRate: loanForm.interestRate || 0,
      loanTerm: loanForm.loanTerm || 0,
      originalMonthlyPayment: 0
    }
  }

  return {
    interestRate: loanForm.rateType === 'annual' ? loanForm.interestRate : loanForm.interestRate * 12,
    loanTerm: loanForm.loanTerm,
    originalMonthlyPayment: calculationResults.value[0]?.payment || 0
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
  // 1. 删除从 period + 1 开始的所有行
  calculationResults.value = calculationResults.value.filter(result => result.period <= period)

  // 2. 计算新的还款计划
  const newPlan = calculateNewPartialPaymentPlan(period, partialAmount, adjustmentType)

  // 3. 将新计划追加到表格
  calculationResults.value = [...calculationResults.value.slice(0, period), ...newPlan]

  ElMessage.success('部分还款计算完成')
}

// 计算新的部分还款计划
const calculateNewPartialPaymentPlan = (period, partialAmount, adjustmentType) => {
  const { interestRate, rateType, loanTerm, startDate } = loanForm

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
  const currentResult = calculationResults.value.find(result => result.period === data.period)
  if (currentResult) {
    currentResult.principal = data.remainingPrincipal
    currentResult.payment = data.totalPayment
    currentResult.remainingPrincipal = 0
  }

  // 2. 删除后续所有行
  calculationResults.value = calculationResults.value.filter(result => result.period <= data.period)

  // 3. 显示贷款已结清状态
  loanSettled.value = true

  ElMessage.success('全部还款完成，贷款已结清！')
}

// 组件挂载时设置默认日期
onMounted(() => {
  setDefaultDate()
})
</script>