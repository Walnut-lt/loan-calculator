<template>
  <el-dialog
    :model-value="visible"
    title="全部还款确认"
    width="500px"
    :close-on-click-modal="false"
    @update:model-value="handleClose"
  >
    <div class="full-payment-info">
      <div class="settlement-info">
        <div class="settlement-icon">
          <div class="icon-circle">
            <el-icon><WarningFilled /></el-icon>
          </div>
        </div>
        <div class="settlement-content">
          <h4>确认全部还款</h4>
          <p>您确定要在第 {{ paymentData?.period }} 期进行全部还款吗？</p>
        </div>
      </div>

      <div class="payment-details">
        <div class="detail-item">
          <span class="detail-label">剩余本金:</span>
          <span class="detail-value">{{ formatNumber(paymentData?.remainingPrincipal || 0) }} 元</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">当期利息:</span>
          <span class="detail-value">{{ formatNumber(paymentData?.currentInterest || 0) }} 元</span>
        </div>
        <div class="amount-divider"></div>
        <div class="detail-item total-amount">
          <span class="detail-label">总还款金额:</span>
          <span class="detail-value">{{ formatNumber(paymentData?.totalPayment || 0) }} 元</span>
        </div>
      </div>
    </div>

    <template #footer>
      <span class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button type="danger" @click="handleConfirm" :loading="confirming">确认还款</el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref } from 'vue'
import { WarningFilled } from '@element-plus/icons-vue'

// Props
const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  paymentData: {
    type: Object,
    default: () => null
  },
  formatNumber: {
    type: Function,
    required: true
  }
})

// Emits
const emit = defineEmits(['update:visible', 'confirm'])

// Refs
const confirming = ref(false)

// 处理关闭
const handleClose = () => {
  emit('update:visible', false)
}

// 处理确认
const handleConfirm = async () => {
  if (!props.paymentData) return

  confirming.value = true

  try {
    // 发送确认事件
    emit('confirm', props.paymentData)

    confirming.value = false
    handleClose()
  } catch (error) {
    console.error('全部还款确认失败:', error)
    confirming.value = false
  }
}
</script>

<style scoped>
.full-payment-info {
  padding: 0;
}

.settlement-info {
  display: flex;
  align-items: center;
  margin-bottom: 25px;
  padding: 20px;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 10px;
  border-left: 5px solid #dc3545;
}

.settlement-icon {
  margin-right: 15px;
}

.icon-circle {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ffc107 0%, #fd7e14 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  box-shadow: 0 4px 12px rgba(255, 193, 7, 0.3);
  color: white;
}

.settlement-content h4 {
  margin: 0 0 8px 0;
  color: #dc3545;
  font-size: 18px;
  font-weight: 600;
}

.settlement-content p {
  margin: 0;
  color: #6c757d;
  font-size: 14px;
}

.payment-details {
  background: #ffffff;
  border-radius: 8px;
  padding: 20px;
  border: 1px solid #e9ecef;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f8f9fa;
}

.detail-item:last-child {
  border-bottom: none;
}

.detail-label {
  font-weight: 500;
  color: #495057;
  font-size: 16px;
}

.detail-value {
  font-weight: 600;
  color: #007bff;
  font-size: 16px;
}

.amount-divider {
  height: 2px;
  background: linear-gradient(90deg, #dee2e6 0%, #adb5bd 50%, #dee2e6 100%);
  margin: 10px 0;
}

.total-amount {
  padding: 12px 0;
  border-top: 2px solid #dc3545;
  margin-top: 10px;
}

.total-amount .detail-label {
  font-size: 18px;
  font-weight: 700;
  color: #dc3545;
}

.total-amount .detail-value {
  font-size: 20px;
  font-weight: 700;
  color: #dc3545;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>