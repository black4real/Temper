import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

// Temper button treatments ("heat and set"), one per role:
// - default (solid ink): a heat band spreads along the bottom edge on hover/focus.
// - outline / secondary: ink floods in from the left, like heat running along a bar.
// - ghost / link: utility, a quiet tone change only.
// Tailwind's hover: variant is already scoped to (hover: hover), so touch never sticks.
const heatBand =
  "bg-[linear-gradient(var(--ember),var(--ember))] bg-no-repeat bg-[position:left_bottom] bg-[length:0%_3px] hover:bg-[length:100%_3px] focus-visible:bg-[length:100%_3px]"
const inkFlood =
  "bg-[linear-gradient(var(--foreground),var(--foreground))] bg-no-repeat bg-[position:left_center] bg-[length:0%_100%] hover:bg-[length:100%_100%] hover:text-background focus-visible:bg-[length:100%_100%] focus-visible:text-background"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-[2px] border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap outline-none select-none transition-[background-size,color,background-color,border-color,translate] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-45 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: cn("bg-primary text-primary-foreground", heatBand),
        outline: cn("border-input bg-transparent text-foreground", inkFlood),
        secondary: cn("bg-secondary text-secondary-foreground", inkFlood),
        ghost:
          "text-foreground hover:bg-muted aria-expanded:bg-muted focus-visible:bg-muted",
        destructive:
          "border-destructive/40 bg-transparent text-destructive bg-[linear-gradient(var(--destructive),var(--destructive))] bg-no-repeat bg-[position:left_center] bg-[length:0%_100%] hover:bg-[length:100%_100%] hover:text-background focus-visible:bg-[length:100%_100%] focus-visible:text-background",
        link: "text-foreground underline underline-offset-4 decoration-1 hover:decoration-2",
      },
      size: {
        default:
          "h-10 gap-2 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        xs: "h-7 gap-1 px-2 text-xs [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 px-3 text-[0.8125rem] [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-12 gap-2 px-5 text-[0.9375rem]",
        icon: "size-10",
        "icon-xs": "size-7 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
