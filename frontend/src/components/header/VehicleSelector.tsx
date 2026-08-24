import { useState } from "react";
import { Check, ChevronsUpDown, CarFront, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useGarage } from "@/src/contexts/garageContext";

import AddVehicleSheet from "./AddVehicleSheet";

const VehicleSelector = () => {
  const { vehicles, selectedVehicle, selectVehicle } = useGarage();
  const [addOpen, setAddOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="outline"
              className="h-11 max-w-64 gap-2.5 rounded-xl border-blue-100 bg-blue-50/60 pr-2.5 pl-2.5 hover:bg-blue-50"
            />
          }
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-white text-blue-600 shadow-xs">
            <CarFront className="size-4" />
          </span>
          <span className="min-w-0 text-left">
            <span className="block truncate text-sm font-semibold text-slate-900">
              {selectedVehicle?.nickname ?? "Select a vehicle"}
            </span>
            <span className="block truncate text-xs font-normal text-slate-500">
              {selectedVehicle
                ? `${selectedVehicle.make} ${selectedVehicle.model}`
                : "No vehicle selected"}
            </span>
          </span>
          <ChevronsUpDown className="size-4 shrink-0 text-slate-400" />
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-72 p-0">
          <div className="max-h-72 overflow-y-auto p-1">
            {vehicles.map((vehicle) => {
              const isSelected = vehicle.id === selectedVehicle?.id;
              return (
                <DropdownMenuItem
                  key={vehicle.id}
                  onClick={() => selectVehicle(vehicle.id)}
                  className="items-start gap-2.5 py-2"
                >
                  <Check
                    className={cn(
                      "mt-0.5 text-blue-600",
                      !isSelected && "invisible"
                    )}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-slate-900">
                      {vehicle.nickname}
                    </span>
                    <span className="block truncate text-xs text-slate-500">
                      {vehicle.year} {vehicle.make} {vehicle.model}
                    </span>
                  </span>
                </DropdownMenuItem>
              );
            })}
          </div>

          <DropdownMenuSeparator className="mx-0 my-0" />

          <div className="p-1">
            <DropdownMenuItem
              onClick={() => setAddOpen(true)}
              className="gap-2.5 py-2 font-medium text-blue-600"
            >
              <Plus />
              Add a new vehicle
            </DropdownMenuItem>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <AddVehicleSheet open={addOpen} onOpenChange={setAddOpen} />
    </>
  );
};

export default VehicleSelector;
