import { useState } from "react";

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
import ImageUploadField from "@/src/components/common/ImageUploadField";
import { useGarage } from "@/src/contexts/garageContext";

interface AddVehicleSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FormState {
  nickname: string;
  year: string;
  make: string;
  model: string;
  trim: string;
  vin: string;
  licensePlate: string;
  mileage: string;
  image?: string;
}

const emptyForm: FormState = {
  nickname: "",
  year: "",
  make: "",
  model: "",
  trim: "",
  vin: "",
  licensePlate: "",
  mileage: "",
  image: undefined,
};

const AddVehicleSheet = ({ open, onOpenChange }: AddVehicleSheetProps) => {
  const { addVehicle } = useGarage();
  const [form, setForm] = useState<FormState>(emptyForm);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const canSave =
    form.nickname.trim() !== "" &&
    form.make.trim() !== "" &&
    form.model.trim() !== "";

  const handleSave = () => {
    addVehicle({
      nickname: form.nickname.trim(),
      year: Number(form.year) || new Date().getFullYear(),
      make: form.make.trim(),
      model: form.model.trim(),
      trim: form.trim.trim() || undefined,
      vin: form.vin.trim(),
      licensePlate: form.licensePlate.trim() || undefined,
      mileage: Number(form.mileage) || 0,
      image: form.image,
    });
    setForm(emptyForm);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full! flex-col gap-0 sm:max-w-md!">
        <SheetHeader className="border-b border-blue-50 px-6 py-5">
          <SheetTitle className="text-lg">Add a vehicle</SheetTitle>
          <SheetDescription>
            Add the basics now — you can attach documents, finance and insurance
            details once the vehicle is in your garage.
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
          <div className="space-y-1.5">
            <Label>Photo</Label>
            <ImageUploadField
              value={form.image}
              onChange={(image) => set("image", image)}
              alt="New vehicle"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="vehicle-nickname">Nickname</Label>
            <Input
              id="vehicle-nickname"
              placeholder="Daily Driver"
              value={form.nickname}
              onChange={(event) => set("nickname", event.target.value)}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="vehicle-year">Year</Label>
              <Input
                id="vehicle-year"
                inputMode="numeric"
                placeholder="2021"
                value={form.year}
                onChange={(event) => set("year", event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vehicle-make">Make</Label>
              <Input
                id="vehicle-make"
                placeholder="Toyota"
                value={form.make}
                onChange={(event) => set("make", event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vehicle-model">Model</Label>
              <Input
                id="vehicle-model"
                placeholder="RAV4"
                value={form.model}
                onChange={(event) => set("model", event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="vehicle-trim">Trim</Label>
            <Input
              id="vehicle-trim"
              placeholder="XLE Premium AWD"
              value={form.trim}
              onChange={(event) => set("trim", event.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="vehicle-vin">VIN</Label>
            <Input
              id="vehicle-vin"
              placeholder="17-character VIN"
              value={form.vin}
              onChange={(event) => set("vin", event.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="vehicle-plate">License plate</Label>
              <Input
                id="vehicle-plate"
                placeholder="8JVK294"
                value={form.licensePlate}
                onChange={(event) => set("licensePlate", event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vehicle-mileage">Mileage</Label>
              <Input
                id="vehicle-mileage"
                inputMode="numeric"
                placeholder="48210"
                value={form.mileage}
                onChange={(event) => set("mileage", event.target.value)}
              />
            </div>
          </div>

        </div>

        <div className="flex justify-end gap-2 border-t border-blue-50 px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!canSave} onClick={handleSave}>
            Add vehicle
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default AddVehicleSheet;
