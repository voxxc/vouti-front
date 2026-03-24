import { useEffect } from "react";

const WHATSAPP_NUMBER = "5592991276333";
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}`;

const WhatsAppRedirect = () => {
  useEffect(() => {
    window.location.href = WHATSAPP_URL;
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-muted-foreground">Redirecionando para o WhatsApp...</p>
    </div>
  );
};

export default WhatsAppRedirect;
