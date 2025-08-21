<script setup>
defineProps({
  modelValue: {
    type: [String, Number],
    default: ''
  },
  placeholder: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    default: 'text'
  },
  error: {
    type: Boolean,
    default: false
  },
  label: {
    type: String,
    default: ''
  },
  dark: {
    type: Boolean,
    default: false
  }
})

defineEmits(['update:modelValue'])
</script>

<template>
  <div>
    <label 
      v-if="label" 
      :class="[
        'block text-sm font-bold mb-1',
        dark ? 'text-brand-white' : 'text-brand-dark'
      ]"
    >
      {{ label }}
    </label>
    <input
      :value="modelValue"
      @input="$emit('update:modelValue', $event.target.value)"
      :class="[
        'w-full px-4 py-3 rounded-lg font-sans text-base transition-all duration-150',
        'focus:outline-none focus:ring-2 focus:ring-offset-2 shadow-sm',
        {
          // Light theme styles
          'border border-brand-grey-light bg-brand-white text-brand-dark placeholder-brand-grey-medium focus:ring-brand-red focus:border-brand-red focus:ring-offset-brand-white': !dark && !error,
          'border border-brand-red bg-brand-white text-brand-dark placeholder-brand-grey-medium focus:ring-brand-red focus:border-brand-red focus:ring-offset-brand-white': !dark && error,
          
          // Dark theme styles
          'border border-brand-grey-dark bg-brand-near-dark text-brand-white placeholder-brand-grey-medium focus:ring-brand-red focus:border-brand-red focus:ring-offset-brand-dark': dark && !error,
          'border border-brand-red bg-brand-near-dark text-brand-white placeholder-brand-grey-medium focus:ring-brand-red focus:border-brand-red focus:ring-offset-brand-dark': dark && error
        }
      ]"
      :placeholder="placeholder"
      :type="type"
    />
  </div>
</template>