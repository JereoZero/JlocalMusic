import { cn } from '../../utils/cn'
import { motion } from 'framer-motion'

interface SettingCardProps {
  children: React.ReactNode
  className?: string
}

export function SettingCard({ children, className }: SettingCardProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'rounded-xl border border-white/5 overflow-hidden',
        'bg-white/[0.02]',
        className
      )}
    >
      {children}
    </motion.section>
  )
}
