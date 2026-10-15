import PropTypes from "prop-types";
import { AutoComplete } from "antd";

// Mevcut menü gruplarını öneren serbest metin alanı
const GroupInput = ({ categories, value, onChange }) => {
  const groups = [...new Set(categories.map((c) => c.group).filter(Boolean))];
  return (
    <AutoComplete
      value={value}
      onChange={onChange}
      options={groups.map((g) => ({ value: g }))}
      placeholder="Örn: Saç Bakımı (boş bırakılırsa 'Diğer')"
      filterOption={(input, option) =>
        option.value
          .toLocaleLowerCase("tr")
          .includes(input.toLocaleLowerCase("tr"))
      }
      allowClear
    />
  );
};

GroupInput.propTypes = {
  categories: PropTypes.array.isRequired,
  value: PropTypes.string,
  onChange: PropTypes.func,
};

export default GroupInput;
