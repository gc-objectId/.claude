import AsyncSelect from "react-select/async";
import axios from "axios";
import { useField } from "formik";

type User = {
  id: string;
  username: string;
  clientUserId: string;
  fullName: string;
};
const promiseOptions = async (inputValue: string) => {
  const response = await axios.get("/api/admin/users", {
    params: {
      page: 0,
      size: 5,
      q: inputValue,
    },
  });
  return response.data.content as User[];
};

function UserSelect({
  isMulti,
  value,
  onChange,
}: {
  isMulti: boolean;
  value: any;
  onChange: (user: any) => void;
}) {
  return (
    <div>
      <AsyncSelect
        isMulti={isMulti}
        defaultOptions
        loadOptions={promiseOptions}
        getOptionLabel={(option) =>
          option.fullName || option.username || option.clientUserId || option.id
        }
        getOptionValue={(option) => {
          return option.id;
        }}
        onChange={onChange}
        value={value}
        placeholder={isMulti ? "Search for users..." : "Search for a user..."}
      />
    </div>
  );
}

export function UserPickerFormikField({
  name,
  isMulti = true,
}: {
  name: string;
  isMulti?: boolean;
}) {
  const [field, , helper] = useField(name);
  return (
    <UserSelect
      isMulti={isMulti}
      value={field.value}
      onChange={(newValue) => helper.setValue(newValue)}
    />
  );
}

export function UserPicker({
  isMulti = true,
  onChange,
  value,
}: {
  isMulti?: boolean;
  onChange?: (user: any) => void;
  value?: any;
}) {
  return (
    <UserSelect
      isMulti={isMulti}
      value={value}
      onChange={(newValue) => onChange?.(newValue)}
    />
  );
}

export type { User };
