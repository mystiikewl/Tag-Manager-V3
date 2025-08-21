<template>
  <button
    :class="[
      'font-sans font-semibold transition-all duration-200 ease-in-out',
      'focus:outline-none focus:ring-2 focus:ring-offset-2',
      variantClasses,
      sizeClasses,
      { 'opacity-50 cursor-not-allowed': disabled }
    ]"
    :disabled="disabled"
  >
    <slot />
  </button>
</template>

<script>
export default {
  props: {
    variant: {
      type: String,
      default: 'primary',
      validator: (value) => ['primary', 'secondary', 'ghost', 'danger'].includes(value)
    },
    size: {
      type: String,
      default: 'medium',
      validator: (value) => ['small', 'medium', 'large'].includes(value)
    },
    disabled: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    variantClasses() {
      return {
        primary: 'bg-brand-red text-brand-white hover:bg-brand-red-dark focus:ring-brand-red focus:ring-offset-brand-white shadow-md',
        secondary: 'bg-brand-near-dark text-brand-white hover:bg-brand-dark focus:ring-brand-near-dark focus:ring-offset-brand-white shadow-md',
        ghost: 'bg-transparent text-brand-dark hover:bg-brand-grey-light focus:ring-brand-grey-medium focus:ring-offset-brand-white',
        danger: 'bg-brand-red text-brand-white hover:bg-brand-red-dark focus:ring-brand-red focus:ring-offset-brand-white shadow-md'
      }[this.variant]
    },
    sizeClasses() {
      return {
        small: 'text-sm py-1.5 px-3 rounded-md',
        medium: 'text-base py-3 px-6 rounded-lg',
        large: 'text-lg py-4 px-8 rounded-lg'
      }[this.size]
    }
  }
}
</script>