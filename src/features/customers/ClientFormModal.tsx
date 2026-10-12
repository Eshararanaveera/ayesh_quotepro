import { useEffect, useState, type FormEvent } from 'react';
import { Building, Hash, Mail, MapPin, Phone, User } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { InputField } from '../../components/ui/InputField';
import { TextAreaField } from '../../components/ui/TextAreaField';
import type { Client, ClientInput } from '../../types/quotation';

const EMPTY: ClientInput = {
  companyName: '',
  contactName: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  taxId: '',
};

type Errors = Partial<Record<keyof ClientInput, string>>;

function validate(values: ClientInput): Errors {
  const errors: Errors = {};
  if (!values.companyName.trim()) errors.companyName = 'Company name is required';
  if (!values.contactName.trim()) errors.contactName = 'Contact person is required';
  if (!values.email.trim()) errors.email = 'Email is required';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) errors.email = 'Enter a valid email address';
  if (values.phone.trim() && !/^\+?[\d\s()-]{9,}$/.test(values.phone.trim())) {
    errors.phone = 'Enter a valid phone number, e.g. +94 77 123 4567';
  }
  return errors;
}

export interface ClientFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Pass a client to edit it; leave empty to add a new one. */
  client?: Client | null;
  onSubmit: (values: ClientInput) => void;
}

/** Add / edit client dialog, shared by the Customers page and the quotation form. */
export function ClientFormModal({ isOpen, onClose, client, onSubmit }: ClientFormModalProps) {
  const [values, setValues] = useState<ClientInput>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});

  // Load the client (or a blank form) each time the dialog opens.
  useEffect(() => {
    if (!isOpen) return;
    if (client) {
      const { id: _id, createdAt: _createdAt, ...rest } = client;
      setValues({ ...EMPTY, ...rest });
    } else {
      setValues(EMPTY);
    }
    setErrors({});
  }, [isOpen, client]);

  const set = (field: keyof ClientInput) => (value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    onSubmit({
      ...values,
      companyName: values.companyName.trim(),
      contactName: values.contactName.trim(),
      email: values.email.trim(),
      phone: values.phone.trim(),
      city: values.city.trim(),
      taxId: values.taxId?.trim() || undefined,
    });
  };

  const formId = 'client-form';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={client ? 'Edit client' : 'Add new client'}
      description="These details appear on the quotations you send."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form={formId}>
            {client ? 'Save changes' : 'Add client'}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit} noValidate className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <InputField
          label="Company name"
          required
          icon={<Building size={16} />}
          placeholder="e.g. Serendib Logistics (Pvt) Ltd"
          value={values.companyName}
          onChange={(e) => set('companyName')(e.target.value)}
          error={errors.companyName}
          containerClassName="sm:col-span-2"
        />
        <InputField
          label="Contact person"
          required
          icon={<User size={16} />}
          placeholder="e.g. Nimal Perera"
          value={values.contactName}
          onChange={(e) => set('contactName')(e.target.value)}
          error={errors.contactName}
        />
        <InputField
          label="Phone"
          type="tel"
          icon={<Phone size={16} />}
          placeholder="+94 77 123 4567"
          value={values.phone}
          onChange={(e) => set('phone')(e.target.value)}
          error={errors.phone}
        />
        <InputField
          label="Email"
          type="email"
          required
          icon={<Mail size={16} />}
          placeholder="name@company.lk"
          value={values.email}
          onChange={(e) => set('email')(e.target.value)}
          error={errors.email}
          containerClassName="sm:col-span-2"
        />
        <TextAreaField
          label="Address"
          rows={2}
          placeholder="Street address"
          value={values.address}
          onChange={(e) => set('address')(e.target.value)}
          containerClassName="sm:col-span-2"
        />
        <InputField
          label="City"
          icon={<MapPin size={16} />}
          placeholder="e.g. Colombo 03"
          value={values.city}
          onChange={(e) => set('city')(e.target.value)}
        />
        <InputField
          label="TIN / VAT No."
          icon={<Hash size={16} />}
          placeholder="Optional"
          value={values.taxId ?? ''}
          onChange={(e) => set('taxId')(e.target.value)}
        />
      </form>
    </Modal>
  );
}
