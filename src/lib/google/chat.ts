import type { Installment } from "@/types";

const WEBHOOK_URL = process.env.GOOGLE_CHAT_WEBHOOK_URL;

export async function sendChatNotification(
  installment: Installment,
  projectName: string,
  meetLink?: string
): Promise<void> {
  if (!WEBHOOK_URL) {
    console.warn("GOOGLE_CHAT_WEBHOOK_URL not set — skipping Chat notification");
    return;
  }

  const buttons = meetLink
    ? [
        {
          buttonList: {
            buttons: [
              {
                text: "เข้า Meet",
                onClick: { openLink: { url: meetLink } },
              },
            ],
          },
        },
      ]
    : [];

  const message = {
    cardsV2: [
      {
        cardId: `reminder-${installment.invoiceNo}-${installment.installmentNo}`,
        card: {
          header: {
            title: "แจ้งเก็บเงิน",
            subtitle: projectName,
            imageUrl:
              "https://fonts.gstatic.com/s/i/short-term/release/googlesymbols/payments/default/48px.svg",
            imageType: "CIRCLE",
          },
          sections: [
            {
              widgets: [
                {
                  decoratedText: {
                    topLabel: "เลขที่ใบแจ้งหนี้",
                    text: installment.invoiceNo,
                  },
                },
                {
                  decoratedText: {
                    topLabel: "งวดที่",
                    text: installment.installmentNo,
                  },
                },
                {
                  decoratedText: {
                    topLabel: "ยอดเงิน",
                    text: `฿${installment.amountDue.toLocaleString()}`,
                  },
                },
                {
                  decoratedText: {
                    topLabel: "วันครบกำหนด",
                    text: installment.dueDate,
                  },
                },
                ...buttons,
              ],
            },
          ],
        },
      },
    ],
  };

  const response = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=UTF-8" },
    body: JSON.stringify(message),
  });

  if (!response.ok) {
    console.error(
      `Google Chat webhook failed: ${response.status} ${response.statusText}`
    );
  }
}
