import * as React from "react"
import { XIcon } from "lucide-react"
import { Dialog as DialogPrimitive } from "radix-ui"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

function Dialog({ ...props }: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({ ...props }: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({ ...props }: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({ ...props }: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn("fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-[2px] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0", className)}
      {...props}
    />
  )
}

function DialogContent({
  className, children, showCloseButton = true, ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & { showCloseButton?: boolean }) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          "fixed top-[50%] left-[50%] z-50 grid w-[calc(100%-2rem)] max-h-[calc(100dvh-2rem)] max-w-2xl translate-x-[-50%] translate-y-[-50%] gap-5 overflow-y-auto rounded-2xl border border-sky-100 bg-[#fbfdff] p-6 shadow-2xl shadow-blue-950/15 duration-200 outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 sm:p-7",
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close className="absolute top-4 right-4 inline-flex size-9 items-center justify-center rounded-lg border border-sky-200 bg-white/90 text-slate-500 shadow-sm transition-colors hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 disabled:pointer-events-none">
            <XIcon className="size-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="dialog-header" className={cn("relative isolate flex flex-col gap-1.5 overflow-hidden rounded-xl border border-sky-100 bg-gradient-to-r from-sky-50 via-blue-50 to-indigo-50 px-4 py-4 pr-12 text-left shadow-sm shadow-sky-100/70 before:absolute before:inset-y-3 before:left-0 before:w-1 before:rounded-r-full before:bg-gradient-to-b before:from-sky-400 before:to-indigo-500", className)} {...props} />
}

function DialogFooter({
  className, showCloseButton = false, children, ...props
}: React.ComponentProps<"div"> & { showCloseButton?: boolean }) {
  return (
    <div data-slot="dialog-footer" className={cn("mt-1 flex flex-col-reverse gap-2 rounded-xl border border-sky-100 bg-[#eef4fa] p-3 sm:flex-row sm:justify-end", className)} {...props}>
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close asChild>
          <Button variant="outline">Close</Button>
        </DialogPrimitive.Close>
      )}
    </div>
  )
}

function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-xl leading-tight font-semibold tracking-tight text-blue-950", className)}
      {...props}
    />
  )
}

function DialogDescription({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogOverlay, DialogPortal, DialogTitle, DialogTrigger }
