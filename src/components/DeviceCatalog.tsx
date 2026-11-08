import React, { useState } from 'react';
import { Device } from '../server/db.ts';
import { Cpu, HardDrive, Wifi, Tv, Terminal, CheckCircle2, ChevronRight } from 'lucide-react';

interface DeviceCatalogProps {
  devices: Device[];
  onSelectDevice: (device: Device) => void;
  selectedEcosystem: string;
  setSelectedEcosystem: (eco: string) => void;
}

export const DeviceCatalog: React.FC<DeviceCatalogProps> = ({
  devices,
  onSelectDevice,
  selectedEcosystem,
  setSelectedEcosystem
}) => {
  const ecosystems = ['All', 'Amazon', 'Google', 'Nvidia', 'Apple', 'LG', 'Samsung', 'Roku'];

  const filtered = selectedEcosystem === 'All'
    ? devices
    : devices.filter(d => d.ecosystem.toLowerCase() === selectedEcosystem.toLowerCase());

  return (
    <div className="space-y-6">
      {/* Ecosystem Filter Tabs (Button-based segmented control §1.A) */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Streaming Hardware Profiles</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Hardware architecture, memory topologies, and ADB debugging ports
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
          {ecosystems.map((eco) => (
            <button
              key={eco}
              onClick={() => setSelectedEcosystem(eco)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap shrink-0 ${
                selectedEcosystem === eco
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {eco === 'All' ? 'All Hardware' : eco}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Devices */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((device) => (
          <div
            key={device.id}
            onClick={() => onSelectDevice(device)}
            className="group cursor-pointer rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-5 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              {/* Device Header */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <span className="text-[11px] font-mono uppercase tracking-wide text-blue-600 dark:text-blue-400 font-semibold">
                  {device.ecosystem}
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  Rel: {device.release_date}
                </span>
              </div>

              <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
                {device.name}
              </h3>
              <p className="text-xs text-slate-500 font-mono mt-1">
                OS: {device.specs.os}
              </p>

              {/* Specs Breakdown */}
              <div className="mt-4 space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <Cpu className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{device.specs.soc}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <HardDrive className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{device.specs.ram} RAM · {device.specs.storage}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                  <Terminal className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span>ADB Port: {device.specs.adb_port > 0 ? device.specs.adb_port : 'Restricted (AirPlay)'}</span>
                </div>
              </div>
            </div>

            {/* Footer with Issue Count */}
            <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-mono">
                {device.issues_count || 0} documented issue{device.issues_count === 1 ? '' : 's'}
              </span>
              <span className="text-blue-600 dark:text-blue-400 font-medium group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                Inspect Specs & Issues <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
