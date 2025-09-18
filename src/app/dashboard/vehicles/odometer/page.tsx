"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useToast } from "@/components/hooks/use-toast";

import {
  OdometerList,
  FormAddOdometer,
  FormEditOdometer,
  OdometerLog,
} from "./components";

export default function OdometerPage() {
  const [odometerLogs, setOdometerLogs] = useState<OdometerLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<OdometerLog | null>(null);

  const { toast } = useToast();

  // Load odometer logs
  const fetchOdometerLogs = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get("/api/vehicles/odometer");
      setOdometerLogs(response.data);
    } catch (error) {
      console.error("Error fetching odometer logs:", error);
      toast({
        title: "Error al cargar registros",
        description: "No se pudieron cargar los registros de odómetro",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOdometerLogs();
  }, []);

  const handleAddOdometer = (newLog: OdometerLog) => {
    setOdometerLogs((prev) => [newLog, ...prev]);
    toast({
      title: "Registro creado",
      description: "El registro de odómetro ha sido creado correctamente",
    });
  };

  const handleEditOdometer = (updatedLog: OdometerLog) => {
    setOdometerLogs((prev) =>
      prev.map((log) => (log.id === updatedLog.id ? updatedLog : log))
    );
    toast({
      title: "Registro actualizado",
      description: "El registro de odómetro ha sido actualizado correctamente",
    });
  };

  const handleEdit = (log: OdometerLog) => {
    setSelectedLog(log);
    setIsEditModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Estás seguro de eliminar este registro de odómetro?")) {
      return;
    }

    try {
      await axios.delete(`/api/vehicles/odometer/${id}`);
      setOdometerLogs((prev) => prev.filter((log) => log.id !== id));
      toast({
        title: "Registro eliminado",
        description: "El registro de odómetro ha sido eliminado correctamente",
      });
    } catch (error) {
      console.error("Error deleting odometer log:", error);
      toast({
        title: "Error al eliminar",
        description: "No se pudo eliminar el registro de odómetro",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-10">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Cargando registros...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <OdometerList
        odometerLogs={odometerLogs}
        onAdd={() => setIsAddModalOpen(true)}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* Add Modal */}
      <FormAddOdometer
        isOpen={isAddModalOpen}
        setIsOpen={setIsAddModalOpen}
        onAddOdometer={handleAddOdometer}
      />

      {/* Edit Modal */}
      <FormEditOdometer
        isOpen={isEditModalOpen}
        setIsOpen={setIsEditModalOpen}
        odometerLog={selectedLog}
        onEditOdometer={handleEditOdometer}
      />

    </div>
  );
}