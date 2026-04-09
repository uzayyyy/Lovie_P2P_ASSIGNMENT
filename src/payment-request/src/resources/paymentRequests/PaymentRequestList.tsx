import { useEffect, useState } from 'react'
import type { ReactElement } from 'react'
import { Box, Tab, Tabs, useMediaQuery, useTheme } from '@mui/material'
import {
  Datagrid,
  DateField,
  List,
  NumberField,
  SearchInput,
  SelectInput,
  SimpleList,
  TextField,
  useGetIdentity,
  useNotify,
} from 'react-admin'
import EmptyState from 'src/components/EmptyState'
import ErrorBoundary from 'src/components/ErrorBoundary'
import { ExpiryCountdownField } from 'src/components/ExpiryCountdown'
import { StatusField } from 'src/components/StatusBadge'
import { supabase } from 'src/providers/supabaseClient'
import {
  PaymentRequestStatusValues,
  RESOURCE_PAYMENT_REQUESTS,
  type IncomingRequestFilter,
  type OutgoingRequestFilter,
} from 'src/types'

type Identity = {
  id: string
}

const statusChoices = PaymentRequestStatusValues.map((status) => ({
  id: status,
  name: status.charAt(0).toUpperCase() + status.slice(1),
}))

const outgoingFilters = [
  <SearchInput
    alwaysOn
    key="outgoing-search"
    parse={(value) => (value ? `*${value}*` : undefined)}
    placeholder="Search by recipient email"
    source="recipient_email@ilike"
  />,
  <SelectInput choices={statusChoices} key="outgoing-status" source="status" />,
]

const incomingFilters = [
  <SearchInput
    alwaysOn
    key="incoming-search"
    parse={(value) => (value ? `*${value}*` : undefined)}
    placeholder="Search by sender id"
    source="sender_id@ilike"
  />,
  <SelectInput choices={statusChoices} key="incoming-status" source="status" />,
]

const RequestListContent = ({
  filters,
  mobilePrimary,
  tab,
}: {
  filters: ReactElement[]
  mobilePrimary: (record: { recipient_email?: string; sender_id?: string }) => string
  tab: 'incoming' | 'outgoing'
}) => {
  const theme = useTheme()
  const { data, isPending } = useGetIdentity()
  const identity = data as Identity | undefined
  const notify = useNotify()
  const isSmall = useMediaQuery(theme.breakpoints.down('sm'))

  useEffect(() => {
    if (!identity?.id) {
      return
    }

    const channel = supabase
      .channel('incoming-requests')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          filter: `recipient_id=eq.${identity.id}`,
          schema: 'public',
          table: 'payment_requests',
        },
        (payload) => {
          const amount = (payload.new as { amount?: number }).amount ?? 0
          notify(`New payment request for ₺${amount}`, { type: 'info' })
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [identity?.id, notify])

  if (isPending || !identity?.id) {
    return null
  }

  const identityId = String(identity.id)

  const filter =
    tab === 'outgoing'
      ? ({ sender_id: identityId } satisfies OutgoingRequestFilter)
      : ({ recipient_id: identityId } satisfies IncomingRequestFilter)

  return (
    <List
      empty={<EmptyState />}
      filters={filters}
      filter={filter}
      key={tab}
      perPage={25}
      resource={RESOURCE_PAYMENT_REQUESTS}
      sort={{ field: 'created_at', order: 'DESC' }}
    >
      {isSmall ? (
        <SimpleList
          linkType="show"
          primaryText={(record) => mobilePrimary(record)}
          secondaryText={(record) => `₺${record.amount}`}
          tertiaryText={(record) => record.status}
        />
      ) : (
        <Datagrid rowClick="show">
          {tab === 'outgoing' ? (
            <TextField label="Recipient" source="recipient_email" />
          ) : (
            <TextField label="Sender" source="sender_id" />
          )}
          <NumberField
            options={{ currency: 'TRY', style: 'currency' }}
            source="amount"
          />
          <StatusField />
          <DateField showTime source="created_at" />
          <ExpiryCountdownField />
        </Datagrid>
      )}
    </List>
  )
}

const PaymentRequestList = () => {
  const [tab, setTab] = useState<'incoming' | 'outgoing'>('outgoing')

  return (
    <Box>
      <Tabs
        onChange={(_, value: 'incoming' | 'outgoing') => setTab(value)}
        sx={{ mb: 2 }}
        value={tab}
      >
        <Tab label="Outgoing" value="outgoing" />
        <Tab label="Incoming" value="incoming" />
      </Tabs>

      <ErrorBoundary>
        {tab === 'outgoing' ? (
          <RequestListContent
            filters={outgoingFilters}
            mobilePrimary={(record) => record.recipient_email ?? 'Unknown recipient'}
            tab="outgoing"
          />
        ) : (
          <RequestListContent
            filters={incomingFilters}
            mobilePrimary={(record) => record.sender_id ?? 'Unknown sender'}
            tab="incoming"
          />
        )}
      </ErrorBoundary>
    </Box>
  )
}

export default PaymentRequestList
