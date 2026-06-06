import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from '@/components/ui/drawer';
import { ChevronDown } from 'lucide-react';

export function MobileSelect({ value, onValueChange, label, options, placeholder }) {
  const [open, setOpen] = useState(false);
  const selectedLabel = options?.find(opt => 
    typeof opt === 'string' ? opt === value : opt.value === value
  );
  const displayLabel = typeof selectedLabel === 'string' ? selectedLabel : selectedLabel?.label;

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="w-full justify-between"
      >
        <span className={!value ? 'text-muted-foreground' : ''}>
          {displayLabel || placeholder || 'Pilih...'}
        </span>
        <ChevronDown className="w-4 h-4 opacity-50" />
      </Button>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{label}</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6 space-y-2">
            {options?.map((opt) => {
              const optValue = typeof opt === 'string' ? opt : opt.value;
              const optLabel = typeof opt === 'string' ? opt : opt.label;
              return (
                <Button
                  key={optValue}
                  variant={value === optValue ? 'default' : 'outline'}
                  className="w-full justify-start"
                  onClick={() => {
                    onValueChange(optValue);
                    setOpen(false);
                  }}
                >
                  {optLabel}
                </Button>
              );
            })}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}