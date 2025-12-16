import React from 'react';
import { AttendanceRecord } from '../types';

interface HistoryLogProps {
  logs: AttendanceRecord[];
}

export const HistoryLog: React.FC<HistoryLogProps> = ({ logs }) => {
  if (logs.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500 bg-white rounded-xl shadow-sm border border-gray-100">
        No attendance records found yet.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
        <h3 className="font-semibold text-gray-800">Attendance History</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3">Time</th>
              <th className="px-6 py-3">Office</th>
              <th className="px-6 py-3">Distance</th>
              <th className="px-6 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {logs.slice().reverse().map((log) => (
              <tr key={log.id} className="bg-white border-b hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  {new Date(log.timestamp).toLocaleString()}
                </td>
                <td className="px-6 py-4 font-medium text-gray-900">
                  {log.officeName}
                </td>
                <td className="px-6 py-4">
                  {log.distance.toFixed(2)}m
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      log.status === 'PRESENT'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {log.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
