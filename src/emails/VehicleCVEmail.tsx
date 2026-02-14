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
import * as React from 'react';

interface VehicleCVEmailProps {
  vehiclePlate: string;
  recipientName?: string;
  tenantName?: string;
}

export const VehicleCVEmail = ({
  vehiclePlate = 'ABC-123',
  recipientName = 'Estimado usuario',
  tenantName = 'FleetCare',
}: VehicleCVEmailProps) => (
  <Html>
    <Head />
    <Preview>Hoja de Vida del Vehículo {vehiclePlate}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Hoja de Vida del Vehículo</Heading>

        <Text style={text}>Hola {recipientName},</Text>

        <Text style={text}>
          Adjunto encontrarás la hoja de vida del vehículo con placa{' '}
          <strong>{vehiclePlate}</strong>, junto con todos sus documentos
          legales vigentes.
        </Text>

        <Text style={text}>Los archivos adjuntos incluyen:</Text>

        <ul style={list}>
          <li>
            <strong>CV del vehículo</strong> con datos técnicos completos
          </li>
          <li>
            <strong>Documentos legales</strong> (SOAT, Tecnomecánica, Póliza,
            etc.) si están disponibles
          </li>
        </ul>

        <Section style={buttonContainer}>
          <Text style={text}>
            Si tienes alguna pregunta sobre este documento, no dudes en
            contactarnos.
          </Text>
        </Section>

        <Text style={footer}>
          Este correo fue enviado automáticamente desde {tenantName}
        </Text>
      </Container>
    </Body>
  </Html>
);

export default VehicleCVEmail;

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
  margin: '40px 0',
  padding: '0',
  textAlign: 'center' as const,
};

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  padding: '0 40px',
};

const list = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  paddingLeft: '60px',
};

const buttonContainer = {
  padding: '27px 0 27px',
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
