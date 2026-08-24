import { useState } from "react";
import { Gauge, IdCard, Pencil, ShieldCheck, Wallet } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import CarImage from "@/src/components/common/CarImage";
import { useGarage } from "@/src/contexts/garageContext";
import {
  describeVehicle,
  formatCompactCurrency,
  formatNumber,
} from "@/src/lib/format";
import type { OwnedVehicle } from "@/src/types/vehicle";

import VehicleEditSheet from "./VehicleEditSheet";

interface VehicleHeroProps {
  vehicle: OwnedVehicle;
}

const VehicleHero = ({ vehicle }: VehicleHeroProps) => {
  const { updateVehicleDetails } = useGarage();
  const [editOpen, setEditOpen] = useState(false);

  const stats = [
    {
      icon: Gauge,
      label: "Mileage",
      value: formatNumber(vehicle.mileage)
        ? `${formatNumber(vehicle.mileage)} mi`
        : "",
    },
    {
      icon: Wallet,
      label: "Estimated value",
      value: formatCompactCurrency(vehicle.estimatedValue),
    },
    {
      icon: ShieldCheck,
      label: "Insured by",
      value: vehicle.insurance.insurer ?? "",
    },
    {
      icon: IdCard,
      label: "Ownership",
      value: vehicle.finance.kind,
    },
  ];

  return (
    <Card className="overflow-hidden rounded-2xl border-blue-100 bg-white shadow-sm">
      <div className="grid gap-0 lg:grid-cols-[minmax(0,22rem)_1fr]">
        <CarImage
          src={vehicle.image}
          alt={describeVehicle(vehicle)}
          className="h-52 w-full lg:h-full"
        />

        <div className="flex flex-col justify-between gap-6 p-6 lg:p-8">
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="font-heading text-2xl font-semibold tracking-tight text-slate-900">
                  {vehicle.nickname}
                </h1>
                <Badge className="bg-blue-50 text-blue-700">
                  {vehicle.finance.kind}
                </Badge>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={() => setEditOpen(true)}
              >
                <Pencil />
                Edit
              </Button>
            </div>
            <p className="text-base text-slate-500">
              {describeVehicle(vehicle)}
            </p>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-1 text-sm">
              <span className="flex items-center gap-2">
                <span className="text-slate-400">Plate</span>
                {vehicle.licensePlate ? (
                  <span className="rounded-md border border-blue-100 bg-blue-50/70 px-2 py-0.5 font-mono text-xs font-semibold tracking-widest text-slate-700 uppercase">
                    {vehicle.licensePlate}
                  </span>
                ) : (
                  <span className="text-slate-300">—</span>
                )}
              </span>
              <span className="flex items-center gap-2">
                <span className="text-slate-400">VIN</span>
                <span className="font-mono text-xs tracking-wide text-slate-700">
                  {vehicle.vin || "—"}
                </span>
              </span>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-4 border-t border-blue-50 pt-5 sm:grid-cols-4">
            {stats.map(({ icon: Icon, label, value }) => (
              <div key={label} className="min-w-0">
                <dt className="flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-slate-400 uppercase">
                  <Icon className="size-3.5 text-blue-400" />
                  {label}
                </dt>
                <dd className="mt-1 truncate text-sm font-semibold text-slate-900">
                  {value || <span className="text-slate-300">—</span>}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <VehicleEditSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        vehicle={vehicle}
        onSave={updateVehicleDetails}
      />
    </Card>
  );
};

export default VehicleHero;
