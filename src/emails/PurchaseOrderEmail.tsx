import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';

interface PurchaseOrderEmailProps {
  orderNumber: string;
  orderType: 'SERVICES' | 'PARTS';
  providerName: string;
  tenantName?: string;
  vehicleInfo?: string;
  itemCount: number;
  totalAmount: string;
}

export const PurchaseOrderEmail = ({
  orderNumber = 'OC-2026-000001',
  orderType = 'PARTS',
  providerName = 'Proveedor',
  tenantName = 'FleetCare',
  vehicleInfo,
  itemCount = 1,
  totalAmount = '$0.00',
}: PurchaseOrderEmailProps) => (
  <Html>
    <Head />
    <Preview>
      Orden de Compra {orderNumber} - {tenantName}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Orden de Compra</Heading>

        <Text style={text}>
          Estimado/a <strong>{providerName}</strong>,
        </Text>

        <Text style={text}>
          Le enviamos la Orden de Compra <strong>{orderNumber}</strong> de{' '}
          {orderType === 'PARTS' ? 'repuestos' : 'servicios'} emitida por{' '}
          <strong>{tenantName}</strong>.
        </Text>

        {vehicleInfo && (
          <Text style={text}>
            Referencia del vehiculo: <strong>{vehicleInfo}</strong>
          </Text>
        )}

        <Section style={summaryBox}>
          <Text style={summaryText}>
            <strong>N° Orden:</strong> {orderNumber}
          </Text>
          <Text style={summaryText}>
            <strong>Tipo:</strong>{' '}
            {orderType === 'PARTS' ? 'Repuestos' : 'Servicios'}
          </Text>
          <Text style={summaryText}>
            <strong>Cantidad de items:</strong> {itemCount}
          </Text>
          <Text style={summaryText}>
            <strong>Total:</strong> {totalAmount}
          </Text>
        </Section>

        <Text style={text}>
          Adjunto encontrara el detalle completo de la orden en formato PDF. Por
          favor confirme la recepcion de este pedido.
        </Text>

        <Text style={text}>
          Ante cualquier consulta, no dude en contactarnos.
        </Text>

        <Text style={footer}>
          Este correo fue enviado automaticamente desde {tenantName} via
          FleetCare
        </Text>
      </Container>
    </Body>
  </Html>
);

export default PurchaseOrderEmail;

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
};

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0 20px',
  padding: '0',
  textAlign: 'center' as const,
};

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  padding: '0 40px',
};

const summaryBox = {
  backgroundColor: '#f0f4f8',
  borderRadius: '8px',
  margin: '20px 40px',
  padding: '16px 24px',
};

const summaryText = {
  color: '#333',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '4px 0',
};

const footer = {
  color: '#898989',
  fontSize: '12px',
  lineHeight: '22px',
  marginTop: '12px',
  marginBottom: '24px',
  padding: '0 40px',
  textAlign: 'center' as const,
};
