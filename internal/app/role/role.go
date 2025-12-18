package role

type Role int

const (
	Buyer   Role = iota // 0
	Manager             // 1
	Admin               // 2
)

// String возвращает строковое представление роли
func (r Role) String() string {
	switch r {
	case Buyer:
		return "buyer"
	case Manager:
		return "manager"
	case Admin:
		return "admin"
	default:
		return "unknown"
	}
}

// FromString преобразует строку в Role
func FromString(s string) Role {
	switch s {
	case "buyer":
		return Buyer
	case "manager":
		return Manager
	case "admin":
		return Admin
	default:
		return Buyer
	}
}

// HasPermission проверяет права доступа
func (r Role) HasPermission(required Role) bool {
	return r >= required
}

// GetRoles возвращает список всех ролей
func GetRoles() []Role {
	return []Role{Buyer, Manager, Admin}
}
