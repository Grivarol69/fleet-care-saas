import { VehiclePartsList } from './components/VehiclePartsList';

export default function VehiclePartsPage() {
    return (
        <div className="container mx-auto py-10">
            <h1 className="text-2xl font-bold mb-2">Base de Conocimiento - Autopartes</h1>
            <p className="text-sm text-slate-500 mb-6">
                Vincula items de mantenimiento con autopartes especificas por marca, linea y anio del vehiculo.
            </p>
            <VehiclePartsList />
        </div>
    );
}
