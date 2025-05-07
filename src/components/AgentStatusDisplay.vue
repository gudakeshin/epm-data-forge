<template>
  <div v-if="statusMessage" class="agent-status-bar">
    <span class="status-icon">⏳</span> {{ statusMessage }}
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useStatusStore } from '@/stores/statusStore'; // Assuming a Pinia store

const statusStore = useStatusStore();
const statusMessage = computed(() => statusStore.latestStatus);

</script>

<style scoped>
.agent-status-bar {
  background-color: #e0f2fe; /* Light blue background */
  color: #0c4a6e; /* Dark blue text */
  padding: 5px 15px;
  font-size: 0.85rem;
  text-align: center;
  border-bottom: 1px solid #bae6fd;
  position: fixed; /* Or adjust based on layout - maybe relative? */
  top: 60px; /* Adjust based on header height */
  left: 0;
  width: 100%;
  z-index: 50; /* Ensure it's visible */
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
}

.status-icon {
  margin-right: 8px;
  /* Optional: Add animation */
  /* animation: spin 2s linear infinite; */
}

/* Optional animation for icon */
/*
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
*/
</style>
