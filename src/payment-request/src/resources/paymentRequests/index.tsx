import { Resource } from 'react-admin'
import PaymentRequestCreate from './PaymentRequestCreate'
import PaymentRequestList from './PaymentRequestList'
import PaymentRequestShow from './PaymentRequestShow'

const paymentRequestsResource = (
  <Resource
    create={PaymentRequestCreate}
    list={PaymentRequestList}
    name="payment_requests"
    recordRepresentation={(record?: { id?: string }) =>
      record?.id ? `Request ${record.id.slice(0, 8)}` : 'Payment request'
    }
    show={PaymentRequestShow}
  />
)

export default paymentRequestsResource
