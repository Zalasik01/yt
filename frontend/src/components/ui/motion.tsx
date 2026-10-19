import { motion, type HTMLMotionProps } from 'motion/react';

const ease = [0.22, 1, 0.36, 1] as const;

/** Entrada suave (fade + subida). `index` cria o efeito em cascata nas listas. */
export function FadeIn({ index = 0, ...props }: HTMLMotionProps<'div'> & { index?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index, 10) * 0.045, ease }}
      {...props}
    />
  );
}
