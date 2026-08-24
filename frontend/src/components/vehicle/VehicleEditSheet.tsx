import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { VehicleDetailsBody } from "@/src/api";
import ImageUploadField from "@/src/components/common/ImageUploadField";
import { describeVehicle } from "@/src/lib/format";
import type { OwnedVehicle } from "@/src/types/vehicle";

interface VehicleEditSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle: OwnedVehicle;
  onSave: (details: VehicleDetailsBody) => void;
}

const toForm = (vehicle: OwnedVehicle) => ({
  nickname: vehicle.nickname,
  year: vehicle.year.toString(),
  make: vehicle.make,
  model: vehicle.model,
  trim: vehicle.trim ?? "",
  vin: vehicle.vin,
  licensePlate: vehicle.licensePlate ?? "",
  mileage: vehicle.mileage.toString(),
  estimatedValue: vehicle.estimatedValue?.toString() ?? "",
  image: vehicle.image,
});

type FormState = ReturnType<typeof toForm>;

const VehicleEditSheet = ({
  open,
  onOpenChange,
  vehicle,
  onSave,
}: VehicleEditSheetProps) => {
  const [form, setForm] = useState<FormState>(() => toForm(vehicle));

  useEffect(() => {
    if (open) setForm(toForm(vehicle));
  }, [open, vehicle]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const canSave =
    form.nickname.trim() !== "" &&
    form.make.trim() !== "" &&
    form.model.trim() !== "";

  const handleSave = () => {
    onSave({
      nickname: form.nickname.trim(),
      year: Number(form.year) || vehicle.year,
      make: form.make.trim(),
      model: form.model.trim(),
      trim: form.trim.trim() || undefined,
      vin: form.vin.trim(),
      licensePlate: form.licensePlate.trim() || undefined,
      mileage: form.mileage.trim() === "" ? 0 : Number(form.mileage),
      estimatedValue:
        form.estimatedValue.trim() === ""
          ? undefined
          : Number(form.estimatedValue),
      image: form.image,
    });
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full! flex-col gap-0 sm:max-w-md!">
        <SheetHeader className="flex-none border-b border-blue-50 px-6 py-5 pr-16">
          <SheetTitle className="text-lg">Edit vehicle</SheetTitle>
          <SheetDescription>{describeVehicle(vehicle)}</SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <div className="space-y-1.5">
            <Label>Photo</Label>
            <ImageUploadField
              value={form.image}
              onChange={(image) => set("image", image)}
              alt={describeVehicle(vehicle)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-nickname">Nickname</Label>
            <Input
              id="edit-nickname"
              value={form.nickname}
              onChange={(event) => set("nickname", event.target.value)}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-year">Year</Label>
              <Input
                id="edit-year"
                inputMode="numeric"
                value={form.year}
                onChange={(event) => set("year", event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-make">Make</Label>
              <Input
                id="edit-make"
                value={form.make}
                onChange={(event) => set("make", event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-model">Model</Label>
              <Input
                id="edit-model"
                value={form.model}
                onChange={(event) => set("model", event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-trim">Trim</Label>
            <Input
              id="edit-trim"
              placeholder="XLE Premium AWD"
              value={form.trim}
              onChange={(event) => set("trim", event.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-vin">VIN</Label>
            <Input
              id="edit-vin"
              className="font-mono"
              placeholder="17-character VIN"
              value={form.vin}
              onChange={(event) => set("vin", event.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-plate">License plate</Label>
              <Input
                id="edit-plate"
                value={form.licensePlate}
                onChange={(event) => set("licensePlate", event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-mileage">Mileage</Label>
              <Input
                id="edit-mileage"
                inputMode="numeric"
                value={form.mileage}
                onChange={(event) => set("mileage", event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-value">Estimated value</Label>
            <Input
              id="edit-value"
              inputMode="decimal"
              placeholder="27400"
              value={form.estimatedValue}
              onChange={(event) => set("estimatedValue", event.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-none justify-end gap-2 border-t border-blue-50 px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!canSave} onClick={handleSave}>
            Save changes
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default VehicleEditSheet;
