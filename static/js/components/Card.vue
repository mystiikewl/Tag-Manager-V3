<script setup>
defineProps({
  title: {
    type: String,
    default: ''
  },
  shadow: {
    type: Boolean,
    default: true
  },
  dark: {
    type: Boolean,
    default: false
  },
  hover: {
    type: Boolean,
    default: true
  }
})
</script>

<template>
  <div 
    :class="[
      'rounded-xl border overflow-hidden transition-all duration-300',
      {
        // Light theme
        'bg-brand-white border-brand-grey-light': !dark,
        'text-brand-dark': !dark,
        
        // Dark theme
        'bg-brand-near-dark border-brand-grey-dark': dark,
        'text-brand-white': dark,
        
        // Shadow options
        'shadow-lg': shadow,
        'brand-shadow': shadow && !dark,
        
        // Hover effects
        'transform hover:-translate-y-1 hover:shadow-xl': hover && !dark,
        'transform hover:-translate-y-1 hover:shadow-2xl': hover && dark,
      }
    ]"
  >
    <div 
      v-if="title" 
      :class="[
        'px-6 py-4 border-b',
        {
          'border-brand-grey-light': !dark,
          'border-brand-grey-dark': dark
        }
      ]"
    >
      <h3 
        :class="[
          'text-xl font-bold tracking-tight',
          {
            'text-brand-dark': !dark,
            'text-brand-white': dark
          }
        ]"
      >
        {{ title }}
      </h3>
    </div>
    <div class="p-6">
      <slot />
    </div>
  </div>
</template>