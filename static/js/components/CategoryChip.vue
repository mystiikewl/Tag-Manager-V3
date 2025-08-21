<script setup>
defineProps({
  category: {
    type: Object,
    required: true,
    default: () => ({ id: 0, name: '', level: 1 })
  },
  selected: {
    type: Boolean,
    default: false
  },
  removable: {
    type: Boolean,
    default: false
  },
  variant: {
    type: String,
    default: 'default',
    validator: (value) => ['default', 'brand'].includes(value)
  }
})

const emit = defineEmits(['remove'])
</script>

<template>
  <div 
    :class="[
      'inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200',
      'border border-transparent shadow-sm',
      {
        // Default variant - level-based colors
        'bg-blue-100 text-blue-800 hover:bg-blue-200': variant === 'default' && category.level === 1 && !selected,
        'bg-red-100 text-red-800 hover:bg-red-200': variant === 'default' && category.level === 2 && !selected,
        'bg-green-100 text-green-800 hover:bg-green-200': variant === 'default' && category.level === 3 && !selected,
        'bg-blue-500 text-white shadow-md': variant === 'default' && category.level === 1 && selected,
        'bg-red-500 text-white shadow-md': variant === 'default' && category.level === 2 && selected,
        'bg-green-500 text-white shadow-md': variant === 'default' && category.level === 3 && selected,
        
        // Brand variant - uses brand colors
        'bg-brand-grey-light text-brand-dark hover:bg-brand-grey-medium hover:text-brand-white': variant === 'brand' && !selected,
        'bg-brand-red text-brand-white brand-shadow hover:bg-brand-red-dark': variant === 'brand' && selected,
        
        // Spacing adjustment for removable chips
        'pr-2': removable
      }
    ]"
  >
    <!-- Level indicator for default variant -->
    <span 
      v-if="variant === 'default'" 
      :class="[
        'inline-flex items-center justify-center w-5 h-5 mr-2 text-xs font-bold rounded-full',
        {
          'bg-blue-600 text-white': category.level === 1,
          'bg-red-600 text-white': category.level === 2,
          'bg-green-600 text-white': category.level === 3
        }
      ]"
    >
      L{{ category.level }}
    </span>
    
    <span class="truncate">{{ category.name }}</span>
    
    <button 
      v-if="removable"
      @click="emit('remove', category.id)"
      class="ml-2 p-1 rounded-full hover:bg-black/10 focus:outline-none focus:ring-2 focus:ring-brand-red focus:ring-offset-2 transition-all duration-150"
      aria-label="Remove category"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  </div>
</template>