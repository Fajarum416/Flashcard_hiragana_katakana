import type { ImgHTMLAttributes } from 'react'
import { useTheme } from '../store/useTheme'

export function Logo({
  className = 'h-9 sm:h-11 w-auto block',
  alt = 'Enna Card',
  ...props
}: ImgHTMLAttributes<HTMLImageElement>) {
  const theme = useTheme((s) => s.theme)

  return (
    <img
      src={theme === 'dark' ? '/logo dark.svg' : '/logo light.svg'}
      alt={alt}
      className={className}
      {...props}
    />
  )
}
