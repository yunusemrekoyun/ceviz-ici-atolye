import { Button, Form, Input, Spin, Upload, message } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import { useState } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import imageCompression from "browser-image-compression";

const CreateBlogPage = () => {
  const [loading, setLoading] = useState(false);
  const [fileList, setFileList] = useState([]);
  const [form] = Form.useForm();
  const [quillContent, setQuillContent] = useState(""); // 👈 içerik burada tutulur
  const apiUrl = import.meta.env.VITE_API_BASE_URL;

  const handleUploadChange = ({ fileList }) => {
    setFileList(fileList.slice(-3));
  };

  const onFinish = async (values) => {
    if (fileList.length === 0) {
      return message.error("En az 1 görsel seçmelisiniz.");
    }

    if (!quillContent || quillContent === "<p><br></p>") {
      return message.error("İçerik boş olamaz.");
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("title", values.title);
      formData.append("content", quillContent); // 👈 içeriği elle ekle

      for (const fileWrapper of fileList) {
        const file = fileWrapper.originFileObj;
        if (!file) continue;

        const compressed = await imageCompression(file, {
          maxSizeMB: 0.5,
          maxWidthOrHeight: 1024,
          useWebWorker: true,
        });

        formData.append("images", compressed);
      }

      const res = await fetch(`${apiUrl}/api/blogs`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        message.success("Blog başarıyla oluşturuldu.");
        form.resetFields();
        setFileList([]);
        setQuillContent(""); // 👈 editor içeriğini sıfırla
      } else {
        message.error("Blog oluşturulamadı.");
      }
    } catch (err) {
      console.error(err);
      message.error("Sunucu hatası oluştu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Spin spinning={loading}>
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        style={{ maxWidth: 600, margin: "0 auto" }}
      >
        <Form.Item
          label="Blog Başlığı"
          name="title"
          rules={[{ required: true, message: "Lütfen başlık girin" }]}
        >
          <Input placeholder="Blog başlığınızı yazın" />
        </Form.Item>

        <Form.Item label="İçerik" required>
          <ReactQuill
            theme="snow"
            value={quillContent}
            onChange={setQuillContent}
            style={{ background: "#fff" }}
          />
        </Form.Item>

        <Form.Item label="Kapak Görselleri" required>
          <Upload
            listType="picture-card"
            fileList={fileList}
            beforeUpload={() => false}
            onChange={handleUploadChange}
            accept="image/*"
            multiple
          >
            {fileList.length < 3 && (
              <div>
                <UploadOutlined />
                <div style={{ marginTop: 8 }}>Yükle</div>
              </div>
            )}
          </Upload>
          <small>En az 1, en fazla 3 görsel yükleyebilirsiniz.</small>
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" block>
            Blog Oluştur
          </Button>
        </Form.Item>
      </Form>
    </Spin>
  );
};

export default CreateBlogPage;
