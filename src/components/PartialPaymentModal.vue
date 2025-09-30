<template>
  <el-dialog
    :model-value="visible"
    title="部分还款"
    width="800px"
    :close-on-click-modal="false"
    @update:model-value="handleClose"
  >
    <div class="modal-info">
      <p>第 <strong>{{ currentPeriod }}</strong> 期</p>
      <p>原定还款日期: <strong>{{ originalDate }}</strong></p>
      <p>期初剩余本金: <strong>{{ formatNumber(remainingPrincipal) }}</strong> 元</p>
    </div>

    <el-form
      ref="formRef"
      :model="form"
      :rules="formRules"
      label-width="140px"
    >
      <el-form-item label="提前还款金额 (元)" prop="partialAmount">
        <el-input-number
          v-model="form.partialAmount"
          :min="0.01"
          :step="1000"
          :precision="2"
          controls-position="right"
          style="width: 100%"
          placeholder="请输入提前还款金额"
          @change="clearSimulation"
        />
      </el-form-item>

      <el-form-item label="提前还款时间" prop="partialPaymentDate">
        <el-date-picker
          v-model="form.partialPaymentDate"
          type="date"
          placeholder="请选择提前还款时间"
          style="width: 100%"
          format="YYYY-MM-DD"
          value-format="YYYY-MM-DD"
          :disabled-date="disabledDate"
          :clearable="true"
          :editable="false"
          @change="clearSimulation"
        />
      </el-form-item>

      <el-form-item label="新贷款利率 (%)" prop="newInterestRate">
        <el-row :gutter="12" style="width: 100%">
          <el-col :span="16">
            <el-input-number
              v-model="form.newInterestRate"
              :min="0"
              :max="50"
              :step="0.1"
              :precision="2"
              controls-position="right"
              style="width: 100%"
              :placeholder="`当前利率 ${loanParams.interestRate.toFixed(2)}%，可修改`"
              @change="clearSimulation"
            >
              <template #suffix>
                <span>%</span>
              </template>
            </el-input-number>
          </el-col>
          <el-col :span="8">
            <el-select
              v-model="form.newRateType"
              style="width: 100%"
              @change="clearSimulation"
            >
              <el-option label="年利率" value="annual" />
              <el-option label="月利率" value="monthly" />
            </el-select>
          </el-col>
        </el-row>
        <div class="form-tip">
          <el-icon><InfoFilled /></el-icon>
          <span>留空则使用当前利率进行计算。调整利率可模拟利率变化对还款的影响</span>
        </div>
      </el-form-item>

      <el-form-item>
        <el-button
          type="info"
          @click="simulatePayment"
          :loading="simulating"
          :disabled="!canSimulate"
        >
          <el-icon><SetUp /></el-icon>
          模拟还款
        </el-button>
        <span class="simulate-tip">先模拟看看两种策略的收益对比</span>
      </el-form-item>
    </el-form>

    <!-- 模拟结果展示区域 -->
    <div v-if="simulationResult" class="simulation-result">
      <!-- 利率变化提示 -->
      <el-alert
        v-if="simulationResult.rateChanged"
        :title="`利率调整：${simulationResult.originalRate.toFixed(2)}%（年利率） → ${simulationResult.newRate.toFixed(2)}%（${simulationResult.newRateType === 'annual' ? '年利率' : '月利率'}）`"
        :description="`利率变化对剩余还款的影响：${simulationResult.rateImpact > 0 ? '节省' : '增加'}利息 ${formatNumber(Math.abs(simulationResult.rateImpact))} 元`"
        :type="simulationResult.rateImpact > 0 ? 'success' : 'warning'"
        show-icon
        :closable="false"
        class="rate-change-alert"
      />

      <el-divider>
        <el-icon><TrendCharts /></el-icon>
        还款策略对比分析
        <span v-if="simulationResult.rateChanged" class="rate-note">（基于新利率 {{ simulationResult.newRate.toFixed(2) }}%）</span>
      </el-divider>

      <el-row :gutter="20">
        <el-col :span="12">
          <el-card class="strategy-card" :class="{ 'selected': form.adjustmentType === 'shorten_term' }">
            <template #header>
              <div class="strategy-header">
                <el-radio
                  v-model="form.adjustmentType"
                  value="shorten_term"
                  size="large"
                >
                  <strong>策略一：月供不变，缩短期限</strong>
                </el-radio>
              </div>
            </template>

            <div class="strategy-content">
              <div class="benefit-item">
                <span class="benefit-label">剩余还款期限</span>
                <span class="benefit-value primary">{{ simulationResult.shortenTerm.remainingTerm }} 个月</span>
              </div>
              <div class="benefit-item">
                <span class="benefit-label">节省期限</span>
                <span class="benefit-value success">减少 {{ simulationResult.shortenTerm.savedTerm }} 个月</span>
              </div>
              <div class="benefit-item">
                <span class="benefit-label">月还款额</span>
                <span class="benefit-value">{{ formatNumber(simulationResult.shortenTerm.monthlyPayment) }} 元</span>
              </div>
              <div class="benefit-item">
                <span class="benefit-label">总利息支出</span>
                <span class="benefit-value">{{ formatNumber(simulationResult.shortenTerm.totalInterest) }} 元</span>
              </div>
              <div class="benefit-item highlight">
                <span class="benefit-label">节省利息</span>
                <span class="benefit-value success">{{ formatNumber(simulationResult.shortenTerm.savedInterest) }} 元</span>
              </div>
            </div>
          </el-card>
        </el-col>

        <el-col :span="12">
          <el-card class="strategy-card" :class="{ 'selected': form.adjustmentType === 'reduce_payment' }">
            <template #header>
              <div class="strategy-header">
                <el-radio
                  v-model="form.adjustmentType"
                  value="reduce_payment"
                  size="large"
                >
                  <strong>策略二：期限不变，减少月供</strong>
                </el-radio>
              </div>
            </template>

            <div class="strategy-content">
              <div class="benefit-item">
                <span class="benefit-label">剩余还款期限</span>
                <span class="benefit-value primary">{{ simulationResult.reducePayment.remainingTerm }} 个月</span>
              </div>
              <div class="benefit-item">
                <span class="benefit-label">月还款额</span>
                <span class="benefit-value success">{{ formatNumber(simulationResult.reducePayment.monthlyPayment) }} 元</span>
              </div>
              <div class="benefit-item">
                <span class="benefit-label">月供减少</span>
                <span class="benefit-value success">减少 {{ formatNumber(simulationResult.reducePayment.savedMonthly) }} 元</span>
              </div>
              <div class="benefit-item">
                <span class="benefit-label">总利息支出</span>
                <span class="benefit-value">{{ formatNumber(simulationResult.reducePayment.totalInterest) }} 元</span>
              </div>
              <div class="benefit-item highlight">
                <span class="benefit-label">节省利息</span>
                <span class="benefit-value success">{{ formatNumber(simulationResult.reducePayment.savedInterest) }} 元</span>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 推荐建议 -->
      <el-alert
        :title="recommendation.title"
        :description="recommendation.description"
        :type="recommendation.type"
        show-icon
        :closable="false"
        class="recommendation"
      />
    </div>

    <template #footer>
      <span class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button
          v-if="simulationResult"
          type="warning"
          @click="clearSimulation"
        >
          重新模拟
        </el-button>
        <el-button
          type="primary"
          @click="handleConfirm"
          :loading="confirming"
          :disabled="!simulationResult"
        >
          确认还款
        </el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, watch, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { SetUp, TrendCharts, InfoFilled } from '@element-plus/icons-vue'

// Props
const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  currentPeriod: {
    type: Number,
    default: null
  },
  originalDate: {
    type: String,
    default: ''
  },
  remainingPrincipal: {
    type: Number,
    default: 0
  },
  formatNumber: {
    type: Function,
    required: true
  },
  // 新增：贷款参数，用于模拟计算
  loanParams: {
    type: Object,
    default: () => ({
      interestRate: 0, // 年利率
      loanTerm: 0, // 总期数
      originalMonthlyPayment: 0 // 原始月供
    })
  }
})

// Emits
const emit = defineEmits(['update:visible', 'confirm'])

// Refs
const formRef = ref()
const confirming = ref(false)
const simulating = ref(false)
const simulationResult = ref(null)

// Form data
const form = reactive({
  partialAmount: null,
  partialPaymentDate: '',
  adjustmentType: 'shorten_term',
  newInterestRate: null, // 新的贷款利率
  newRateType: 'annual' // 新利率类型，默认年利率
})

// Form rules
const formRules = {
  partialAmount: [
    { required: true, message: '请输入提前还款金额', trigger: 'blur' },
    { type: 'number', min: 0.01, message: '还款金额必须大于0', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (value && value >= props.remainingPrincipal) {
          callback(new Error('部分还款金额不能大于或等于剩余本金'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ],
  partialPaymentDate: [
    { required: true, message: '请选择提前还款时间', trigger: 'change' }
  ],
  adjustmentType: [
    { required: true, message: '请选择调整方式', trigger: 'change' }
  ],
  newInterestRate: [
    { type: 'number', min: 0, max: 50, message: '利率应在0-50%之间', trigger: 'blur' }
  ],
  newRateType: [
    { required: true, message: '请选择利率类型', trigger: 'change' }
  ]
}

// 禁用日期函数
const disabledDate = (time) => {
  // 确保时间参数有效
  if (!time) {
    console.log('日期选择器: 时间参数无效', time)
    return true
  }

  const minData = new Date(props.originalDate)
  minData.setHours(0, 0, 0, 0)

  const selectedDate = new Date(time)
  selectedDate.setHours(0, 0, 0, 0)

  // 不能选择今天之前的日期
  if (selectedDate.getTime() < minData.getTime()) {
    console.log('日期选择器: 日期早于原定还款日期', selectedDate, minData)
    return true
  }

  // 如果有原定还款日期，不能选择超过原定日期+1个月的日期
  if (props.originalDate) {
    try {
      const originalDateObj = new Date(props.originalDate)
      // 检查原定日期是否有效
      if (isNaN(originalDateObj.getTime())) {
        console.log('日期选择器: 原定日期无效', props.originalDate)
        return false // 如果原定日期无效，只限制不能早于今天
      }

      const maxDate = new Date(originalDateObj)
      maxDate.setMonth(maxDate.getMonth() + 1)
      maxDate.setDate(maxDate.getDate() - 1) // 减1天
      maxDate.setHours(23, 59, 59, 999) // 设置为当天的最后一刻

      if (selectedDate.getTime() > maxDate.getTime()) {
        console.log('日期选择器: 日期超出允许范围', selectedDate, maxDate)
        return true
      }
    } catch (error) {
      console.warn('日期计算错误:', error)
      return false // 出错时只限制不能早于今天
    }
  }

  console.log('日期选择器: 日期可选', selectedDate)
  return false
}

// 计算能力检查
const canSimulate = computed(() => {
  return form.partialAmount > 0 && form.partialPaymentDate &&
         form.partialAmount < props.remainingPrincipal
})

// 推荐建议
const recommendation = computed(() => {
  if (!simulationResult.value) return { title: '', description: '', type: 'info' }

  const shortenSaved = simulationResult.value.shortenTerm.savedInterest
  const reduceSaved = simulationResult.value.reducePayment.savedInterest

  if (shortenSaved > reduceSaved) {
    const difference = shortenSaved - reduceSaved
    return {
      title: '推荐策略一：月供不变，缩短期限',
      description: `相比策略二，可额外节省利息 ${props.formatNumber(difference)} 元，并能提前 ${simulationResult.value.shortenTerm.savedTerm} 个月还清贷款。`,
      type: 'success'
    }
  } else if (reduceSaved > shortenSaved) {
    const difference = reduceSaved - shortenSaved
    return {
      title: '推荐策略二：期限不变，减少月供',
      description: `相比策略一，可额外节省利息 ${props.formatNumber(difference)} 元，月供减少 ${props.formatNumber(simulationResult.value.reducePayment.savedMonthly)} 元，减轻月度资金压力。`,
      type: 'success'
    }
  } else {
    return {
      title: '两种策略收益相近',
      description: '可根据个人资金安排选择：想提前还清选择策略一，想减轻月供压力选择策略二。',
      type: 'warning'
    }
  }
})

// 清除模拟结果
const clearSimulation = () => {
  simulationResult.value = null
}

// 模拟还款计算
const simulatePayment = async () => {
  if (!canSimulate.value) {
    ElMessage.warning('请先填写有效的还款金额和时间')
    return
  }

  simulating.value = true

  try {
    // 模拟延时，增加真实感
    await new Promise(resolve => setTimeout(resolve, 800))

    // 使用新利率或原利率
    const effectiveInterestRate = form.newInterestRate !== null ? form.newInterestRate : props.loanParams.interestRate
    const effectiveRateType = form.newInterestRate !== null ? form.newRateType : 'annual' // 原始利率默认为年利率

    // 转换为月利率
    let monthlyRate
    if (effectiveRateType === 'annual') {
      monthlyRate = effectiveInterestRate / 100 / 12
    } else {
      monthlyRate = effectiveInterestRate / 100
    }

    const originalMonthlyRate = props.loanParams.interestRate / 100 / 12

    const originalRemainingTerm = props.loanParams.loanTerm - props.currentPeriod + 1
    const newRemainingPrincipal = props.remainingPrincipal - form.partialAmount

    // 计算原始剩余还款情况（不提前还款，使用新利率）
    const originalTotalPayment = calculateOriginalRemainingPayment(
      props.remainingPrincipal,
      monthlyRate,
      originalRemainingTerm,
      props.loanParams.originalMonthlyPayment
    )

    // 计算原始利率下的剩余还款情况（用于对比）
    const originalRatePayment = calculateOriginalRemainingPayment(
      props.remainingPrincipal,
      originalMonthlyRate,
      originalRemainingTerm,
      props.loanParams.originalMonthlyPayment
    )

    // 策略一：月供不变，缩短期限（使用新利率）
    const shortenTermResult = calculateShortenTerm(
      newRemainingPrincipal,
      monthlyRate,
      props.loanParams.originalMonthlyPayment
    )

    // 策略二：期限不变，减少月供（使用新利率）
    const reducePaymentResult = calculateReducePayment(
      newRemainingPrincipal,
      monthlyRate,
      originalRemainingTerm
    )

    simulationResult.value = {
      shortenTerm: {
        remainingTerm: shortenTermResult.term,
        savedTerm: originalRemainingTerm - shortenTermResult.term,
        monthlyPayment: props.loanParams.originalMonthlyPayment,
        totalInterest: shortenTermResult.totalInterest,
        savedInterest: originalTotalPayment.totalInterest - shortenTermResult.totalInterest,
        newInterestRate: effectiveInterestRate
      },
      reducePayment: {
        remainingTerm: originalRemainingTerm,
        monthlyPayment: reducePaymentResult.monthlyPayment,
        savedMonthly: props.loanParams.originalMonthlyPayment - reducePaymentResult.monthlyPayment,
        totalInterest: reducePaymentResult.totalInterest,
        savedInterest: originalTotalPayment.totalInterest - reducePaymentResult.totalInterest,
        newInterestRate: effectiveInterestRate
      },
      // 添加利率变化信息
      rateChanged: form.newInterestRate !== null,
      originalRate: props.loanParams.interestRate,
      originalRateType: 'annual', // 原始利率为年利率
      newRate: effectiveInterestRate,
      newRateType: effectiveRateType,
      rateImpact: form.newInterestRate !== null ?
        originalRatePayment.totalInterest - originalTotalPayment.totalInterest : 0
    }

    ElMessage.success('模拟计算完成！')
  } catch (error) {
    console.error('模拟计算失败:', error)
    ElMessage.error('模拟计算失败，请重试')
  } finally {
    simulating.value = false
  }
}

// 计算原始剩余还款情况
const calculateOriginalRemainingPayment = (principal, monthlyRate, term, monthlyPayment) => {
  let remainingPrincipal = principal
  let totalInterest = 0

  for (let i = 0; i < term; i++) {
    const interestPayment = remainingPrincipal * monthlyRate
    const principalPayment = monthlyPayment - interestPayment
    totalInterest += interestPayment
    remainingPrincipal -= principalPayment

    if (remainingPrincipal <= 0) break
  }

  return { totalInterest, totalPayment: term * monthlyPayment }
}

// 计算缩短期限策略
const calculateShortenTerm = (principal, monthlyRate, monthlyPayment) => {
  if (monthlyRate === 0) {
    return {
      term: Math.ceil(principal / monthlyPayment),
      totalInterest: 0
    }
  }

  // 使用等额本息公式计算新期数
  const term = Math.ceil(
    Math.log(1 + (principal * monthlyRate) / monthlyPayment) /
    Math.log(1 + monthlyRate)
  )

  let remainingPrincipal = principal
  let totalInterest = 0

  for (let i = 0; i < term; i++) {
    const interestPayment = remainingPrincipal * monthlyRate
    const principalPayment = monthlyPayment - interestPayment
    totalInterest += interestPayment
    remainingPrincipal -= principalPayment

    if (remainingPrincipal <= 0) break
  }

  return { term, totalInterest }
}

// 计算减少月供策略
const calculateReducePayment = (principal, monthlyRate, term) => {
  if (monthlyRate === 0) {
    return {
      monthlyPayment: principal / term,
      totalInterest: 0
    }
  }

  // 计算新的月供
  const monthlyPayment = principal *
    (monthlyRate * Math.pow(1 + monthlyRate, term)) /
    (Math.pow(1 + monthlyRate, term) - 1)

  let remainingPrincipal = principal
  let totalInterest = 0

  for (let i = 0; i < term; i++) {
    const interestPayment = remainingPrincipal * monthlyRate
    const principalPayment = monthlyPayment - interestPayment
    totalInterest += interestPayment
    remainingPrincipal -= principalPayment

    if (remainingPrincipal <= 0) break
  }

  return { monthlyPayment, totalInterest }
}

// 重置表单
const resetForm = () => {
  form.partialAmount = null
  form.partialPaymentDate = ''
  form.adjustmentType = 'shorten_term'
  form.newInterestRate = null
  form.newRateType = 'annual' // 重置为默认年利率
  simulationResult.value = null

  if (formRef.value) {
    formRef.value.clearValidate()
  }
}

// 设置默认日期
const setDefaultDate = () => {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (props.originalDate) {
      const originalDate = new Date(props.originalDate)

      // 检查原定日期是否有效
      if (!isNaN(originalDate.getTime())) {
        originalDate.setHours(10, 0, 0, 0)

        // 设置默认日期为今天，但不能早于今天
        const defaultDate = today.getTime() > originalDate.getTime() ? today : originalDate
        form.partialPaymentDate = defaultDate.toISOString().split('T')[0]
      } else {
        // 如果原定日期无效，使用今天
        form.partialPaymentDate = today.toISOString().split('T')[0]
      }
    } else {
      // 如果没有原定日期，使用今天
      form.partialPaymentDate = today.toISOString().split('T')[0]
    }
  } catch (error) {
    console.warn('设置默认日期失败:', error)
    // 出错时使用今天
    const today = new Date()
    form.partialPaymentDate = today.toISOString().split('T')[0]
  }
}

// 处理关闭
const handleClose = () => {
  resetForm()
  emit('update:visible', false)
}

// 处理确认
const handleConfirm = async () => {
  if (!formRef.value) return

  if (!simulationResult.value) {
    ElMessage.warning('请先进行模拟还款再确认')
    return
  }

  try {
    await formRef.value.validate()

    confirming.value = true

    // 发送确认事件
    emit('confirm', {
      period: props.currentPeriod,
      partialAmount: form.partialAmount,
      partialPaymentDate: form.partialPaymentDate,
      adjustmentType: form.adjustmentType,
      newInterestRate: form.newInterestRate, // 新利率
      newRateType: form.newRateType, // 新利率类型
      simulationData: simulationResult.value // 包含模拟数据
    })

    confirming.value = false
    handleClose()
  } catch (error) {
    console.log('表单验证失败:', error)
    confirming.value = false
  }
}

// 监听弹窗显示状态
watch(() => props.visible, (newVal) => {
  if (newVal) {
    resetForm()
    setDefaultDate()
  }
})
</script>

<style scoped>
.modal-info {
  padding: 16px;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 8px;
  margin-bottom: 20px;
  border-left: 4px solid #409eff;
}

.modal-info p {
  margin: 8px 0;
  color: #606266;
}

.modal-info strong {
  color: #303133;
  font-weight: 600;
}

.simulate-tip {
  margin-left: 12px;
  color: #909399;
  font-size: 13px;
}

.form-tip {
  width: 100%;
  display: flex;
  align-items: center;
  margin-top: 4px;
  padding: 8px 12px;
  background: #f8f9fa;
  border-radius: 4px;
  color: #606266;
  font-size: 12px;
  line-height: 1.4;
}

.form-tip .el-icon {
  margin-right: 6px;
  color: #409eff;
}

.rate-change-alert {
  margin-bottom: 16px;
}

.rate-note {
  font-size: 12px;
  color: #909399;
  font-weight: normal;
}

.rate-section-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 12px;
  padding-left: 4px;
}

/* 模拟结果区域 */
.simulation-result {
  margin-top: 24px;
  padding: 0;
}

.simulation-result .el-divider {
  margin: 20px 0;
}

.simulation-result .el-divider__text {
  background: #fff;
  color: #409eff;
  font-weight: 600;
  font-size: 16px;
}

/* 策略卡片 */
.strategy-card {
  border-radius: 12px;
  transition: all 0.3s ease;
  border: 2px solid transparent;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.strategy-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.strategy-card.selected {
  border-color: #409eff;
  box-shadow: 0 8px 25px rgba(64, 158, 255, 0.25);
}

.strategy-header {
  padding: 0;
}

.strategy-header .el-radio {
  width: 100%;
  margin: 0;
}

.strategy-header .el-radio__label {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.strategy-content {
  padding: 8px 0 0 0;
}

.benefit-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f5f7fa;
  transition: background-color 0.2s ease;
}

.benefit-item:last-child {
  border-bottom: none;
}

.benefit-item:hover {
  background-color: #fafafa;
  border-radius: 6px;
  padding-left: 8px;
  padding-right: 8px;
}

.benefit-item.highlight {
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  border-radius: 8px;
  border: 1px solid #409eff;
  font-weight: 600;
  margin-top: 8px;
}

.benefit-label {
  color: #606266;
  font-size: 14px;
  font-weight: 500;
}

.benefit-value {
  font-weight: 600;
  font-size: 15px;
  color: #303133;
}

.benefit-value.success {
  color: #67c23a;
}

.benefit-value.primary {
  color: #409eff;
}

.benefit-value.warning {
  color: #e6a23c;
}

.benefit-value.danger {
  color: #f56c6c;
}

/* 推荐建议 */
.recommendation {
  margin-top: 20px;
  border-radius: 8px;
}

.recommendation .el-alert__title {
  font-size: 16px;
  font-weight: 600;
}

.recommendation .el-alert__description {
  margin-top: 8px;
  line-height: 1.6;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .simulation-result .el-col {
    margin-bottom: 16px;
  }

  .strategy-card {
    margin-bottom: 16px;
  }

  .benefit-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }

  .benefit-value {
    align-self: flex-end;
  }

  .dialog-footer {
    flex-direction: column;
    gap: 8px;
  }

  .dialog-footer .el-button {
    width: 100%;
  }
}

/* 动画效果 */
.simulation-result {
  animation: slideIn 0.4s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.strategy-card {
  animation: cardAppear 0.5s ease-out;
}

@keyframes cardAppear {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
