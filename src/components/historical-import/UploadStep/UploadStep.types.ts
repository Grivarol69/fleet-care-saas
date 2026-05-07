import type {
  ColumnMap,
  ParsedRow,
  RawRow,
  VehicleLookup,
} from '../lib/csvParser';

export type UploadStepProps = {
  onParsed: (data: {
    file: File;
    rawRows: RawRow[];
    columnMap: ColumnMap;
    parsedRows: ParsedRow[];
    vehicleLookup: VehicleLookup;
  }) => void;
};
